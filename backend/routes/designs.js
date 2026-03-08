import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { openRouterService } from '../services/openRouter.js';
import { imageStorage } from '../services/imageStorage.js';
import { removeBgService } from '../services/removeBg.js';

const router = express.Router();

// Generate design logic remains unchanged
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { prompt, tshirtColor = '#1a1a1a' } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const user = await db.getUserById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.generations_used >= 5) {
            return res.status(403).json({ error: 'Daily limit reached' });
        }

        console.log('✨ Generating image with Gemini 2.5 via OpenRouter...');
        const base64DataUrl = await openRouterService.generateImage(prompt);
        
        // Remove background for the interactive decal
        const transparentBase64 = await removeBgService.process(base64DataUrl);

        console.log('☁️ Optimizing and uploading to Cloudflare R2...');
        const uploadedUrl = await imageStorage.uploadBase64(transparentBase64, 'designs');

        const design = await db.createDesign(
            req.userId,
            prompt,
            uploadedUrl,
            uploadedUrl,
            tshirtColor
        );

        await db.updateUserGenerationCount(req.userId);
        const updatedUser = await db.getUserById(req.userId);

        res.json({
            success: true,
            designId: design.id,
            imageUrl: uploadedUrl,
            generationsLeft: 5 - updatedUser.generations_used
        });
    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ error: 'Generation failed: ' + error.message });
    }
});


// Get design history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const designs = await db.getDesignsByUserId(req.userId);
        const user = await db.getUserById(req.userId);

        res.json({
            designs,
            generationsUsed: user.generations_used,
            isFinalized: user.is_finalized
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Update design position
router.put('/:designId/position', authMiddleware, async (req, res) => {
    try {
        const { designId } = req.params;
        const { x, y, scale } = req.body;

        const design = await db.getDesignById(designId, req.userId);
        if (!design) {
            return res.status(404).json({ error: 'Design not found' });
        }

        const updated = await db.updateDesignPosition(designId, req.userId, x, y, scale);

        res.json({ success: true, designPosition: updated.design_position });
    } catch (error) {
        console.error('Position update error:', error);
        res.status(500).json({ error: 'Failed to update position' });
    }
});

router.post('/:designId/finalize', authMiddleware, async (req, res) => {
    try {
        const { designId } = req.params;
        const { finalImage } = req.body; // This is the Base64 from the high-res canvas

        if (!finalImage) {
            return res.status(400).json({ error: 'Final baked image is required' });
        }

        // 1. Verify design exists and belongs to user
        const design = await db.getDesignById(designId, req.userId);
        if (!design) {
            return res.status(404).json({ error: 'Design not found' });
        }

        // 2. Process the base64 string into a buffer
        // Note: frontend uses image/jpeg for the baked composite
        const base64Data = finalImage.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // 3. Define a consistent filename to prevent 404s
        const fileName = `${designId}-production-proof.jpg`;

        console.log(`🏭 Baking production proof for Design: ${designId}...`);

        // 4. Upload to the 'finals' folder in R2
        // We use uploadBuffer to keep the high resolution from the canvas
        const finalUrl = await imageStorage.uploadBuffer(buffer, fileName, 'finals');

        // 5. Save the final URL and mark as finalized in DB
        const updated = await db.finalizeDesign(designId, req.userId, finalUrl);

        // 6. Lock the user's session for the day (Optional, based on your business rules)
        await db.finalizeUserDesign(req.userId);

        res.json({
            success: true,
            message: 'Design baked and stored for production.',
            finalizedImageUrl: finalUrl
        });
    } catch (error) {
        console.error('Finalize error:', error);
        res.status(500).json({ error: 'Failed to finalize design: ' + error.message });
    }
});

export default router;