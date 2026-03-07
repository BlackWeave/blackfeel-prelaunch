import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../models/database.js';
import { openRouterService } from '../services/openRouter.js';
import { imageStorage } from '../services/imageStorage.js';
import { removeBgService } from '../services/removeBg.js';

const router = express.Router();

// Generate design with OpenRouter
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { prompt, tshirtColor = '#1a1a1a' } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Get user
        const user = await db.getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check generation limits
        if (user.generations_used >= 5) {
            return res.status(403).json({
                error: 'Daily generation limit reached (5/5)',
                generationsUsed: user.generations_used
            });
        }

        if (user.is_finalized) {
            return res.status(403).json({
                error: 'Design already finalized. Come back tomorrow for more.'
            });
        }

        // Generate image with OpenRouter (Gemini 2.5 Flash Image)
        console.log('✨ Generating image with Gemini 2.5 via OpenRouter for prompt:', prompt);
        const base64DataUrl = await openRouterService.generateImage(prompt);
        const transparentBase64 = await removeBgService.process(base64DataUrl);

        if (!base64DataUrl) {
            return res.status(500).json({ error: 'Failed to generate image' });
        }

        // Upload Base64 directly to R2
        console.log('☁️ Optimizing and uploading to Cloudflare R2...');
        const uploadedUrl = await imageStorage.uploadBase64(transparentBase64, 'designs');

        // Save design to database
        const design = await db.createDesign(
            req.userId,
            prompt,
            uploadedUrl,
            uploadedUrl,
            tshirtColor
        );

        // Update user generation count
        await db.updateUserGenerationCount(req.userId);
        const updatedUser = await db.getUserById(req.userId);

        res.json({
            success: true,
            designId: design.id,
            imageUrl: uploadedUrl,
            generationsUsed: updatedUser.generations_used,
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

// Finalize design
router.post('/:designId/finalize', authMiddleware, async (req, res) => {
    try {
        const { designId } = req.params;
        const { finalImage } = req.body;

        if (!finalImage) {
            return res.status(400).json({ error: 'Final image is required' });
        }

        const design = await db.getDesignById(designId, req.userId);
        if (!design) {
            return res.status(404).json({ error: 'Design not found' });
        }

        if (design.is_finalized) {
            return res.status(400).json({ error: 'Design already finalized' });
        }

        // Upload final image
        const buffer = Buffer.from(finalImage.split(',')[1], 'base64');
        const finalUrl = await imageStorage.uploadBuffer(buffer, `${designId}-final.webp`, 'finals');

        // Update design
        const updated = await db.finalizeDesign(designId, req.userId, finalUrl);

        // Finalize user
        await db.finalizeUserDesign(req.userId);

        res.json({
            success: true,
            message: 'Design finalized successfully',
            finalizedImageUrl: finalUrl
        });
    } catch (error) {
        console.error('Finalize error:', error);
        res.status(500).json({ error: 'Failed to finalize design: ' + error.message });
    }
});

export default router;
