import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { train } from '@zappar/imagetraining';
import { createClient } from '@supabase/supabase-js';

const app = express();

// ✅ Allow requests from ZapWorks hosted app + local dev
app.use(cors({
  origin: [
    'https://r7jen.zappar.io',
    'http://localhost:3000',
    'https://localhost:3000',
  ],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

const upload = multer({ storage: multer.memoryStorage() });

// ✅ Use env vars — set these in Railway dashboard
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://szsxhrswbvrawasnxalp.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c3hocnN3YnZyYXdhc254YWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjQ4NzMsImV4cCI6MjA5MTAwMDg3M30.331a4bwblDhXvauAFyiyFB5W7cpW1xKt-EBipY89tyw'
);

// Health check — Railway uses this to confirm server is alive
app.get('/', (req, res) => {
  res.json({ status: 'QS Nexus Train Server is running ✅' });
});

app.post('/api/train', upload.single('image'), async (req, res) => {
  try {
    const projectId = req.body.projectId;
    if (!req.file || !projectId) {
      return res.status(400).json({ error: 'Missing image or projectId' });
    }

    console.log(`🔄 Training image for project ${projectId}...`);
    const zpt = await train(req.file.buffer);

    const fileName = `target_${projectId}.zpt`;
    const { error } = await supabase.storage
      .from('QS-NexusARTarget')
      .upload(fileName, Buffer.from(zpt), {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('QS-NexusARTarget')
      .getPublicUrl(fileName);

    console.log(`✅ Done: ${data.publicUrl}`);
    res.json({ url: data.publicUrl });

  } catch (err) {
    console.error('Training failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Railway injects PORT env var — must use it
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🟢 Train server running on port ${PORT}`));
