import axios from 'axios';
import fs from 'fs';

const API_KEY = 'AIzaSyDKIlvhfSR_eBvX3z65k0eKgAQiqZa2Ow8';  // 🔑 Reemplaza con tu clave de Google Cloud
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// 📌 Función para convertir imagen a Base64
function convertirImagenABase64(rutaImagen) {
    const imagenBuffer = fs.readFileSync(rutaImagen);
    return imagenBuffer.toString('base64');
}

// 📌 Soportes varios
async function verificarSoportesVarios(imagenPDF, tipoSoporte, detalle) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);

    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde al siguiente soporte: 
                        - Tipo de Soporte: ${tipoSoporte} 
                        - Detalle: ${detalle} 
                        
                        Si el contenido coincide exactamente, responde solo "Sí coinciden". 
                        Si hay diferencias, responde "No coinciden" y di por que.
                        Y si el contenido muestra un mensaje de error, responde "Error de formato" y di por que.
                        
                        No uses saltos de linea en tu respuesta.`
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
    }
}
    
// Educacion formal
async function verificarEducacionFormal(imagenPDF, institucion, titulo) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);
    
    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde a los siguientes datos:
                                - Institución: ${institucion}
                                - Título: ${titulo}

                                Si la información del documento es consistente con los datos proporcionados, responde solo "Sí coinciden".  
                                Si hay diferencias significativas, responde "No coinciden" y explica por qué.  
                                Si el documento muestra un mensaje de error, responde "Error de formato".  

                                📌 **Reglas para la verificación (sigue todas cuidadosamente):**  
                                2. **Ignora diferencias en mayúsculas, minúsculas y tildes.**  
                                3. **Si el documento menciona que la persona está "cursando" o "ha terminado" un programa que lleva al título proporcionado, se considera válido.**  
                                4. **El nombre de la institución puede tener pequeñas variaciones en redacción mientras sea la misma entidad.**  
                                5. **El título no necesita coincidir palabra por palabra, pero sí debe representar el mismo nivel académico y especialidad.**  
                                    - ✅ Válido: "Ingeniería Informática" → "Ingeniero(a) Informático(a)"  
                                    - ✅ Válido: "Bachiller Académico" → "Básica Secundaria"  
                                    - ❌ No válido: "Técnico en Informática" → "Ingeniero(a) Informático(a)"  
                                6. **No confundas el campo de "Institución" con el campo de "Título".**  
                                    - El campo "Institución" debe compararse con el nombre de la entidad educativa que emitió el certificado.  
                                    - El campo "Título" debe compararse con el nivel o grado académico alcanzado por la persona.  

                                Recuerda: si el documento indica que se finalizó "Bachillerato", "Educación Media" o "Bachiller Académico", se puede considerar equivalente a "Básica Secundaria", siempre que no contradiga el nivel indicado.  
                                No uses saltos de línea en tu respuesta. 
                                `
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
        return "Error en la consulta";
    }
}

// Experiencia Laboral
async function verificarExperienciaLaboral(imagenPDF, entidad, cargo, fechaIngreso) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);
    
    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde a los siguientes datos:
                                - Entidad: ${entidad}
                                - Cargo: ${cargo}
                                - Fecha de Ingreso: ${fechaIngreso}

                                Si la información del documento es consistente con los datos proporcionados, responde solo "Sí coinciden".  
                                Si hay diferencias significativas, responde "No coinciden" y explica por qué.  
                                Si el documento muestra un mensaje de error, responde "Error de formato".  

                                📌 **Reglas para la verificación:**  
                                1. **Ignora diferencias en mayúsculas, minúsculas y tildes.**  
                                2. **El nombre de la entidad puede tener pequeñas variaciones en redacción mientras sea la misma organización.**  
                                3. **El cargo no necesita coincidir palabra por palabra, pero debe representar la misma posición y responsabilidades.**  
                                4. **La fecha de ingreso debe ser exacta o aproximada si hay una razón justificada.** 
                        
                                No uses saltos de linea en tu respuesta. 
                                `
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
        return "Error en la consulta";
    }
}

// Experiencia Laboral docente
async function verificarExperienciaLaboralDocente(imagenPDF, institucion, fechaIngreso) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);
    
    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde a los siguientes datos:
                                - Institución Educativa: ${institucion}
                                - Fecha de Ingreso: ${fechaIngreso}

                                Si la información del documento es consistente con los datos proporcionados, responde solo "Sí coinciden".  
                                Si hay diferencias significativas, responde "No coinciden" y explica por qué.  
                                Si el documento muestra un mensaje de error, responde "Error de formato".  

                                📌 **Reglas para la verificación:**  
                                1. **Ignora diferencias en mayúsculas, minúsculas y tildes.**  
                                2. **El nombre de la institución puede tener pequeñas variaciones en redacción mientras sea la misma organización.**  
                                3. **La fecha de ingreso debe ser exacta o aproximada si hay una razón justificada.**  
                        
                                No uses saltos de linea en tu respuesta.
                                `
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
        return "Error en la consulta";
    }
}

// Documentos Adicionales
async function verificarDocumentosAdicionales(imagenPDF, tipoDocumento, descripcion) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);

    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde al siguiente soporte: 
                        - Tipo de Documento: ${tipoDocumento} 
                        - Descripción: ${descripcion} 
                        
                        Si el contenido coincide exactamente, responde solo "Sí coinciden". 
                        Si hay diferencias, responde "No coinciden" y di por que.
                        Y si el contenido muestra un mensaje de error, responde "Error de formato" y di por que.
                        
                        No uses saltos de linea en tu respuesta.`
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
    }
}

// Educacion para el trabajo
async function verificarEducacionTrabajo(imagenPDF, institucion, curso, fecha) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);
    
    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde a los siguientes datos:
                                - Institución: ${institucion}
                                - Curso: ${curso}
                                - Fecha de Terminación: ${fecha}

                                Si la información del documento es consistente con los datos proporcionados, responde solo "Sí coinciden".  
                                Si hay diferencias significativas, responde "No coinciden" y explica por qué.  
                                Si el documento muestra un mensaje de error, responde "Error de formato".  

                                📌 **Reglas para la verificación:**  
                                1. **Ignora diferencias en mayúsculas, minúsculas y tildes.**  
                                2. **El nombre de la entidad puede tener pequeñas variaciones en redacción mientras sea la misma organización.**  
                                3. **El cargo no necesita coincidir palabra por palabra, pero debe representar la misma posición y responsabilidades.**  
                                4. **La fecha de ingreso debe ser exacta o aproximada si hay una razón justificada.** 
                        
                                No uses saltos de linea en tu respuesta. 
                                `
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
        return "Error en la consulta";
    }
}

// Idiomas
async function verificarIdiomas(imagenPDF, lenguaje) {
    const imagenBase64 = convertirImagenABase64(imagenPDF);

    const payload = {
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imagenBase64
                        }
                    },
                    {
                        text: `Verifica si el contenido del documento en la imagen corresponde al siguiente soporte: 
                        - Lenguaje: ${lenguaje} 
                        
                        Si el contenido coincide exactamente, responde solo "Sí coinciden". 
                        Si hay diferencias, responde "No coinciden" y di por que.
                        Y si el contenido muestra un mensaje de error, responde "Error de formato" y di por que.
                        
                        No uses saltos de linea en tu respuesta.`
                    }
                ]
            }
        ]
    };
    
    try {
        const respuesta = await axios.post(GEMINI_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        const texto = respuesta.data.candidates[0]?.content?.parts[0]?.text;
        console.log('📊 Respuesta de Gemini:', texto);
        return texto;
    } catch (error) {
        console.error('❌ Error al enviar a Gemini:', error.response?.data || error.message);
    }
}


export{ verificarSoportesVarios, verificarEducacionFormal, verificarExperienciaLaboral, verificarExperienciaLaboralDocente, verificarDocumentosAdicionales, verificarEducacionTrabajo, verificarIdiomas };