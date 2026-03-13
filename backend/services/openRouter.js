// backend/services/openRouter.js
import axios from 'axios';

export const openRouterService = {
    async generateImage(prompt) {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'google/gemini-3.1-flash-image-preview',
                    messages: [
                        {
                            role: 'user',
                            content: `${prompt}, t-shirt graphic design ONLY, isolated design element, NO t-shirt mockup, transparent background, vector art style, clean edges, high quality`
                        }
                    ],
                    // FIX: Must include both for Gemini to trigger image generation
                    modalities: ["image", "text"]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
                        'X-Title': 'LUXE.AI'
                    }
                }
            );

            // OpenRouter returns images in the message.images array
            const message = response.data.choices[0].message;
            let imageUrl = '';
            
            if (message.images && message.images.length > 0) {
                 // Check if it's a direct URL or a nested object
                 imageUrl = message.images[0].url || message.images[0].image_url?.url || message.images[0];
            } else if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
                 imageUrl = message.content;
            }

            if (!imageUrl) {
                console.error("OpenRouter Response Structure:", JSON.stringify(response.data, null, 2));
                throw new Error('No image returned in response');
            }

            return imageUrl;
        } catch (error) {
            console.error('OpenRouter generation error:', error.response?.data || error.message);
            throw new Error('Image generation failed.');
        }
    }
};