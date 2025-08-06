import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dividirTextoEnLineasAvanzado(texto, font, fontSize, maxWidth) {
    const palabras = texto.split(' ');
    const lineas = [];
    let linea = '';

    for (const palabra of palabras) {
        const lineaProvisional = linea + palabra + ' ';
        const width = font.widthOfTextAtSize(lineaProvisional, fontSize);

        if (width > maxWidth) {
            if (linea.trim() === '') {
                const letras = palabra.split('');
                let subPalabra = '';
                for (const letra of letras) {
                    const temp = subPalabra + letra;
                    const tempWidth = font.widthOfTextAtSize(temp, fontSize);
                    if (tempWidth > maxWidth) {
                        lineas.push(subPalabra);
                        subPalabra = letra;
                    } else {
                        subPalabra = temp;
                    }
                }
                if (subPalabra) lineas.push(subPalabra);
                linea = '';
            } else {
                lineas.push(linea.trim());
                linea = palabra + ' ';
            }
        } else {
            linea = lineaProvisional;
        }
    }

    if (linea.trim()) lineas.push(linea.trim());
    return lineas;
}

async function generarReportePDF(estadoHV, capturasTablas, datosPersona, soportes, educacion, expLaboral, expDocente, datAdicionales, eduTrabajo, idiomas) {
    const pdfDoc = await PDFDocument.create();
    const logoBytes = fs.readFileSync(path.join(__dirname, '../img/logo.png'));
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scaleToFit(100, 50);  // Ajusta el tamaño del logo

    // Registra fontkit
    pdfDoc.registerFontkit(fontkit);

    // Usa una fuente que soporte tildes y ñ (por ejemplo, Roboto o cualquier otra que soporte UTF-8)
    const fontBytes = fs.readFileSync(path.join(__dirname, '../fonts/Roboto-Regular.ttf'));
    const boldFontBytes = fs.readFileSync(path.join(__dirname, '../fonts/Roboto-Bold.ttf'));
    const font = await pdfDoc.embedFont(fontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    const pageSize = [595.28, 841.89]; // A4
    const textSize = 12;
    const lineHeight = 20;

    let pageCount = 0; // Para paginación

    const nuevaPagina = (pdfDoc, pageSize, logoImage) => {
        const newPage = pdfDoc.addPage(pageSize);
        pageCount++;
        
        // Dibuja el logo en la parte superior izquierda del encabezado
        const logoX = 50;  // Ajuste el valor de `x` según el espacio
        const logoY = pageSize[1] - 50 - logoDims.height;  // Alineado con la parte superior de la página (encabezado)
        newPage.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoDims.width,
            height: logoDims.height
        });

        // Dibuja el texto a la derecha del logo, alineado al nivel del logo (encabezado)
        const textoDerecha = "REGIONAL ANTIOQUIA - PROCESO GESTIÓN DEL TALENTO HUMANO";
        const textoWidth = font.widthOfTextAtSize(textoDerecha, 8);  // Reduce el tamaño del texto a 10
        const textoX = logoX + logoDims.width + 10; // 10px de separación después del logo
        const textoY = logoY;  // Alineado con el logo

        newPage.drawText(textoDerecha, {
            x: textoX,
            y: textoY,  // Alineado con el logo
            size: 10,  // Reducido tamaño de texto
            font,
            color: rgb(0, 0, 0), // Color negro
        });

        return { page: newPage, y: logoY - 20 }; // Ajuste para dejar espacio debajo del logo
    };

    // Primera página: Portada centrada
    let { page, y } = nuevaPagina(pdfDoc, pageSize, logoImage);
    const titulo = 'Verificación de Soportes de Hoja de Vida SIGEP';
    const tituloSize = 22;
    const tituloWidth = boldFont.widthOfTextAtSize(titulo, tituloSize);
    const tituloX = (pageSize[0] - tituloWidth) / 2;
    y = pageSize[1] / 2 + 100; // Centramos verticalmente y guardamos en `y`;

    page.drawText(titulo, {
        x: tituloX,
        y,
        size: tituloSize,
        font: boldFont,
        color: rgb(0, 0, 0), // Color negro
    });

    if (datosPersona) {
        const { nombre, tipoDoc, id, fechaNac, edad, genero, correo } = datosPersona;

        const datosTexto = [
            `Nombre: ${nombre}`,
            `Tipo de Documento: ${tipoDoc}`,
            `Número de Identificación: ${id}`,
            `Fecha de Nacimiento: ${fechaNac} (Edad: ${edad})`,
            `Correo: ${correo}`,
            `Género: ${genero}`,
            `Estado de Hoja de Vida: ${estadoHV}`,
            `Fecha del reporte: ${new Date().toLocaleDateString()}`,  // Fecha de generación del reporte
            `Hora del reporte: ${new Date().toLocaleTimeString()}`,  // Fecha de generación del reporte
        ];

        const totalAlturaBloque = datosTexto.length * lineHeight;
        y = 50 + totalAlturaBloque; // Deja la última línea justo a 50 de la base

        for (const dato of datosTexto) {
            page.drawText(dato, { x: 50, y, size: textSize, font });
            y -= lineHeight;
        }
    }

    // Ahora comenzamos las secciones, cada una en una nueva página
    const secciones = [
        { nombre: 'SOPORTES VARIOS', datos: soportes },
        { nombre: 'EDUCACIÓN', datos: educacion },
        { nombre: 'EDUCACIÓN PARA EL TRABAJO', datos: eduTrabajo },
        { nombre: 'IDIOMAS', datos: idiomas },
        { nombre: 'EXPERIENCIA LABORAL', datos: expLaboral },
        { nombre: 'EXPERIENCIA DOCENTE', datos: expDocente },
        { nombre: 'DOCUMENTOS ADICIONALES', datos: datAdicionales },
        { nombre: 'LOGROS Y MANEJO DE RECURSOS', datos: [] },
        { nombre: 'PUBLICACIONES', datos: [] },
        { nombre: 'EVALUACIONES DE DESEMPEÑO', datos: [] },
        { nombre: 'PREMIOS Y RECONOCIMIENTOS', datos: [] },
        { nombre: 'PARTICIPACIÓN EN PROYECTOS', datos: [] },
        { nombre: 'PARTICIPACIÓN EN CORPORACIONES Y ENTIDADES', datos: [] }
    ];

    const tablasCapturadas = new Set();

    for (const { nombre, datos } of secciones) {
        // Si aún no se han impreso las capturas para esta tabla
        if (!tablasCapturadas.has(nombre)) {
            const capturas = capturasTablas.filter(c => c.tabla === nombre);
        
            if (capturas.length > 0) {
                // Solo una vez, al inicio de las capturas de esta tabla
                ({ page, y } = nuevaPagina(pdfDoc, pageSize, logoImage));
        
                page.drawText(`${nombre}`, {
                    x: 50,
                    y,
                    size: 14,
                    font: boldFont,
                    color: rgb(0, 0, 0)
                });
                y -= lineHeight;
            }
        
            for (let i = 0; i < capturas.length; i++) {
                const captura = capturas[i];
        
                if (captura.imagen && fs.existsSync(captura.imagen)) {
                    // Crear nueva página cada 2 capturas
                    if (i % 2 === 0 && i !== 0) {
                        ({ page, y } = nuevaPagina(pdfDoc, pageSize, logoImage));
                    }
        
                    const imageBytes = fs.readFileSync(captura.imagen);
                    const image = await pdfDoc.embedPng(imageBytes);
                    const dims = image.scaleToFit(pageSize[0] - 190, 300);
        
                    page.drawImage(image, {
                        x: 100,
                        y: y - dims.height,
                        width: dims.width,
                        height: dims.height
                    });
        
                    y -= dims.height + 10;
        
                    // Texto debajo de la imagen
                    
        
                    page.drawText(`Página ${captura.pagina || '---'} --- Tomada el ${captura.horaTabla || '---'}`, {
                        x: 100,
                        y,
                        size: 11,
                        font
                    });
        
                    y -= lineHeight + 10; // espacio entre capturas
                }
            }
        
            // Marcar como capturada para no repetir
            tablasCapturadas.add(nombre);
        }
        

        if (!datos || datos.length === 0) continue;

        // Nueva página
        ({ page, y } = nuevaPagina(pdfDoc, pageSize, logoImage));

        // // Dibujamos el título de la sección en negrita y negro
        // page.drawText(nombre, {
        //     x: 50,
        //     y,
        //     size: 14,
        //     font: boldFont,
        //     color: rgb(0, 0, 0), // Color negro
        // });
        // y -= lineHeight;

        for (const item of datos) {
            let lineasTexto = [];
        
            switch (nombre) {
                case 'SOPORTES VARIOS':
                    lineasTexto.push(`• Tipo de soporte: ${item.tipoSoporte || '---'}`);
                    lineasTexto.push(`• Detalle: ${item.detalle || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
        
                case 'EDUCACIÓN':
                    lineasTexto.push(`• Institución: ${item.institucion || '---'}`);
                    lineasTexto.push(`• Título: ${item.titulo || '---'}`);
                    lineasTexto.push(`• Estado del Estudio: ${item.estadoEstudio || '---'}`);
                    lineasTexto.push(`• Fecha de Finalización: ${item.fechaFin || '---'}`);
                    lineasTexto.push(`• Documento: ${item.documento || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
                    
                case 'EDUCACIÓN PARA EL TRABAJO':
                    lineasTexto.push(`• Institución: ${item.institucion || '---'}`);
                    lineasTexto.push(`• Curso: ${item.curso || '---'}`);
                    lineasTexto.push(`• Fecha de Terminación: ${item.fecha || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
                
                case 'IDIOMAS':
                    lineasTexto.push(`• Lenguaje: ${item.lenguaje || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
        
                case 'EXPERIENCIA LABORAL':
                    lineasTexto.push(`• Entidad: ${item.entidad || '---'}`);
                    lineasTexto.push(`• Cargo: ${item.cargo || '---'}`);
                    lineasTexto.push(`• Fecha de Ingreso: ${item.fechaIngreso || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
        
                case 'EXPERIENCIA DOCENTE':
                    lineasTexto.push(`• Institución: ${item.institucion || '---'}`);
                    lineasTexto.push(`• Fecha de ingreso: ${item.fechaIngreso || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
                
                case 'DOCUMENTOS ADICIONALES':
                    lineasTexto.push(`• Tipo de documento: ${item.tipoDocumento || '---'}`);
                    lineasTexto.push(`• Descripción: ${item.descripcion || '---'}`);
                    lineasTexto.push(`• Resultado:`);
                    lineasTexto.push(...dividirTextoEnLineasAvanzado(item.resultado || '---', font, 11, 495));
                    lineasTexto.push(`• Fecha y hora de la revisión: ${item.horaCaptura || '---'}`);
                    break;
            }
        
            // Estimar altura requerida
            const textoAltura = lineasTexto.length * 16 + lineHeight;
        
            // Preparar imágenes
            let imagenes = [];
            for (const imgPath of [item.imagen || item.imagenPath, item.imagenGemini]) {
                if (imgPath && fs.existsSync(imgPath)) {
                    const imageBytes = fs.readFileSync(imgPath);
                    const image = await pdfDoc.embedPng(imageBytes);
                    const imgDims = image.scaleToFit(pageSize[0] - 190, 290);
                    imagenes.push({ image, dims: imgDims });
                }
            }
        
            // Calcular altura total necesaria
            const imagenesAltura = imagenes.reduce((sum, img) => sum + img.dims.height + lineHeight, 0);
            const alturaTotal = textoAltura + imagenesAltura;
        
            // Crear nueva página si no hay suficiente espacio
            if (y < alturaTotal + 50) {
                ({ page, y } = nuevaPagina(pdfDoc, pageSize, logoImage));
            }
        
            // Imprimir texto
            for (const linea of lineasTexto) {
                page.drawText(linea, { x: 50, y, size: 11, font });
                y -= 16;
            }
        
            y -= lineHeight;
        
            // Imprimir imágenes
            for (const { image, dims } of imagenes) {
                page.drawImage(image, {
                    x: 100,
                    y: y - dims.height,
                    width: dims.width,
                    height: dims.height,
                });
                y -= dims.height + lineHeight;
            }
        }
        
    }

    // Paginación
    for (let i = 0; i < pageCount; i++) {
        const pagina = pdfDoc.getPage(i);
        pagina.drawText(`Página ${i + 1} de ${pageCount}`, {
            x: pageSize[0] - 100,
            y: 50,
            size: 10,
            font,
            color: rgb(0, 0, 0),
        });
    }

    // Sanitizamos el nombre del archivo
    const nombreCompleto = datosPersona?.nombre || 'Desconocido';  // Aseguramos que 'nombre' no sea undefined
    const nombresArray = nombreCompleto.split(' ');  // Dividimos el nombre completo en partes

    const primerNombre = nombresArray[0];  // Primer nombre
    const primerApellido = nombresArray.length > 1 ? nombresArray[1] : 'Desconocido';  // Primer apellido, si existe

    const nombreSanitizado = `${primerNombre}_${primerApellido}`;
    const idDoc = datosPersona?.id || 'SinDocumento';  // Si no hay id, usar 'SinDocumento'

    // Componemos el nombre del archivo
    const nombreArchivo = path.join(__dirname, `../reportes/Reporte_${idDoc}_${nombreSanitizado}.pdf`);

    const pdfBytes = await pdfDoc.save();

    // Guardar el PDF en el servidor
    fs.writeFileSync(nombreArchivo, pdfBytes);

    return nombreArchivo;
}




// module.exports = {
//     generarReportePDF,
// };

export { generarReportePDF };
