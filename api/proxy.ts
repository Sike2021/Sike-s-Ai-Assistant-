// api/proxy.ts
export default async function handler(req: any, res: any) {
 if (req.method !== 'POST') {
 return res.status(405).json({ error: 'Method not allowed' });
 const { prompt = '', model = 'google/flan-t5-xl' } = req.body || {};
 const HF_API_KEY = process.env.HF_API_KEY;
   // If you don't have a Hugging Face key yet, return a safe mock response
 if (!HF_API_KEY) {
 return res.json({
 text: Mock response: SigNify received your prompt: "${String(prompt).slice(0, 200)}",
 });
 }

if (!response.ok) {
  const errTxt = await response.text();
  return res.status(response.status).json({ error: errTxt });
}

const data = await response.json();
// Normalize common HF responses to a single text field
let text = '';
if (Array.isArray(data) && data[0]?.generated_text) text = data[0].generated_text;
else text = data.generated_text ?? JSON.stringify(data);

return res.json({ text });
  } catch (err) {
 console.error(err);
 return res.status(500).json({ error: 'Server error' });
