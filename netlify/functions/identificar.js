const crypto = require('crypto');

exports.handler = async (event) => {
  // Solo aceptamos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    // 1. Recibimos el audio desde tu index.html en formato Base64
    const { audioBase64 } = JSON.parse(event.body);
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // 2. Cogemos tus claves secretas de las variables de entorno de Netlify
    const host = process.env.ACR_HOST;
    const accessKey = process.env.ACR_ACCESS_KEY;
    const accessSecret = process.env.ACR_ACCESS_SECRET;

    // 3. Generamos la firma de seguridad HMAC-SHA1
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `POST\n/v1/identify\n${accessKey}\naudio\n1\n${timestamp}`;
    const signature = crypto.createHmac('sha1', accessSecret).update(stringToSign).digest('base64');

    // 4. Preparamos los datos para ACRCloud usando el FormData nativo
    const formData = new FormData();
    formData.append('sample', new Blob([audioBuffer]), 'audio.webm');
    formData.append('sample_bytes', audioBuffer.length.toString());
    formData.append('access_key', accessKey);
    formData.append('data_type', 'audio');
    formData.append('signature_version', '1');
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());

    // 5. Enviamos a ACRCloud
    const response = await fetch(`https://${host}/v1/identify`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    // 6. Le devolvemos el resultado a tu web
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Error en la función:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Fallo al procesar el audio en el servidor' }) 
    };
  }
};