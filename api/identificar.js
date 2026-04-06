const crypto = require('crypto');

module.exports = async (req, res) => {
  // Vercel solo debe aceptar peticiones POST para esto
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite POST' });
  }

  try {
    // Vercel parsea el body automáticamente, pero por si acaso lo aseguramos
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const base64Audio = body.audioBase64;

    if (!base64Audio) {
      return res.status(400).json({ error: 'No se ha recibido el audio' });
    }

    // Convertir el audio en base 64 a un buffer binario
    const buffer = Buffer.from(base64Audio, 'base64');

    // Cargar tus llaves de Vercel (Environment Variables)
    const host = process.env.ACR_HOST;
    const accessKey = process.env.ACR_ACCESS_KEY;
    const accessSecret = process.env.ACR_SECRET_KEY;

    // Configuración de firma obligatoria de ACRCloud
    const endpoint = '/v1/identify';
    const signatureVersion = '1';
    const dataType = 'audio';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Crear la firma encriptada
    const stringToSign = ['POST', endpoint, accessKey, dataType, signatureVersion, timestamp].join('\n');
    const signature = crypto.createHmac('sha1', accessSecret).update(Buffer.from(stringToSign, 'utf-8')).digest('base64');

    // Preparar los datos como si fuera un formulario HTML
    const formData = new FormData();
    formData.append('sample', new Blob([buffer]), 'sample.webm');
    formData.append('access_key', accessKey);
    formData.append('data_type', dataType);
    formData.append('signature_version', signatureVersion);
    formData.append('signature', signature);
    formData.append('sample_bytes', buffer.length.toString());
    formData.append('timestamp', timestamp);

    // Enviar el audio a ACRCloud
    const acrResponse = await fetch(`https://${host}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    const data = await acrResponse.json();
    
    // Devolver la respuesta a nuestra web
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error en la función de Vercel:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};