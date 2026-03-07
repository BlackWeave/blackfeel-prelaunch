import axios from 'axios';
import FormData from 'form-data';

export const removeBgService = {
    async process(base64String) {
        try {
            console.log('✂️ Removing background...');
            // Clean the base64 string
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            const formData = new FormData();
            formData.append('image_file', buffer, { filename: 'design.png' });
            formData.append('size', 'auto');

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': process.env.REMOVE_BG_API_KEY // Add this to your .env
                },
                responseType: 'arraybuffer'
            });

            // Convert back to base64 so imageStorage can handle it as usual
            return `data:image/png;base64,${Buffer.from(response.data).toString('base64')}`;
        } catch (error) {
            console.error('Background removal failed:', error.response?.data?.toString() || error.message);
            // Fallback: return original image if removal fails so the app doesn't crash
            return base64String; 
        }
    }
};