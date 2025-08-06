import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { fromPath } from 'pdf2pic';
import { 
  verificarSoportesVarios, 
  verificarEducacionFormal, 
  verificarExperienciaLaboral, 
  verificarExperienciaLaboralDocente, 
  verificarDocumentosAdicionales, 
  verificarEducacionTrabajo, 
  verificarIdiomas 
} from '../utils/gemini';
import { generarReportePDF } from '../utils/pdf';
import https from 'https';
import http from 'http';
import * as XLSX from 'xlsx';

// Función para obtener la fecha y hora actual en formato dd-mm-yyyy_hh-mm-ss
function obtenerFechaActual() {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0'); // Enero es 0
    const yyyy = hoy.getFullYear();
    const hh = String(hoy.getHours()).padStart(2, '0');
    const min = String(hoy.getMinutes()).padStart(2, '0');
    const ss = String(hoy.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}_${hh}-${min}-${ss}`;
}

function formatearFechaExcel(fecha) {
    const partes = fecha.match(/(\d{1,2})\s+de\s+([a-zA-Z]+)\s+del\s+(\d{4})/);
    if (!partes) return fecha;

    const meses = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    const dia = partes[1].padStart(2, '0');
    const mes = meses[partes[2].toLowerCase()];
    const año = partes[3];

    return `${dia}/${mes}/${año}`;
}

// Función para calcular la edad
function calcularEdad(fechaNacimiento) {
    console.log(`📅 Fecha recibida: "${fechaNacimiento}"`); // Verifica formato

    // Asegurar que la fecha está bien formateada eliminando espacios extra
    fechaNacimiento = fechaNacimiento.trim().replace(/\s+/g, ' ');

    // Intentar extraer con una expresión regular mejorada
    const match = fechaNacimiento.match(/^(\d{1,2})\s+de\s+([a-zA-Z]+)\s+del\s+(\d{4})$/i);
    
    if (!match) {
        console.error('⚠️ Formato de fecha incorrecto:', fechaNacimiento);
        return 'ERROR';
    }

    const [, dia, mes, año] = match; // Extraer valores correctamente

    const meses = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    if (!meses.hasOwnProperty(mes.toLowerCase())) {
        console.error('⚠️ Error al procesar el mes:', mes);
        return 'ERROR';
    }

    const fechaNac = new Date(parseInt(año, 10), meses[mes.toLowerCase()], parseInt(dia, 10));
    if (isNaN(fechaNac.getTime())) {
        console.error('⚠️ Fecha inválida generada:', fechaNac);
        return 'ERROR';
    }

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    if (hoy.getMonth() < fechaNac.getMonth() || (hoy.getMonth() === fechaNac.getMonth() && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }

    console.log(`🎂 Edad calculada: ${edad}`);
    return edad;
}

function generarReporte(datosExcel, rutaArchivo) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // **1. TÍTULO EN A1:L1**
    const titulo = [`Reporte de documentación actual (${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })})`];
    XLSX.utils.sheet_add_aoa(ws, [titulo], { origin: 'A1' });

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    ws['A1'].s = { 
        font: { bold: true, sz: 14 }, 
        alignment: { horizontal: 'center', vertical: 'center' }
    };

    // **2. ENCABEZADOS EN A2**
    const headers = [
        'DOCUMENTO', 'TIPO DTO', 'NOMBRE COMPLETO', 'DOCUMENTACIÓN', 'FECHA DE NACIMIENTO', 'EDAD', 'GÉNERO', 'CORREO PERSONAL', 'CORREO OFICINA', 'TELÉFONO RESIDENCIAL', 'TELÉFONO CELULAR', 'TELÉFONO OFICINA', 'DIRECCIÓN', 'ZONA', 'MUNICIPIO', 'DEPARTAMENTO', 'PAIS'
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A2' });

    headers.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: colIdx });
        if (!ws[cellRef]) ws[cellRef] = {}; // Asegurar que la celda exista
        ws[cellRef].s = {
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '404040' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };
    });

    ws['!rows'] = [{ hpx: 64 }];

    // **3. AJUSTE DE ANCHOS DE COLUMNA**
    ws['!cols'] = [
        { wpx: 100 }, // DOCUMENTO
        { wch: 18.38 },  // TIPO DTO
        { wpx: 200 }, // NOMBRE COMPLETO
        { wpx: 120 }, // DOCUMENTACIÓN
        { wch: 21.75 }, // FECHA DE NACIMIENTO
        { wpx: 50 },  // EDAD
        { wpx: 80 },  // GÉNERO
        { wpx: 180 }, // CORREO PERSONAL
        { wpx: 180 }, // CORREO OFICINA
        { wpx: 130 }, // TELÉFONO RESIDENCIAL
        { wpx: 120 }, // TELÉFONO CELULAR
        { wch: 26.13 }, // TELÉFONO OFICINA
        { wch: 50.00 }, // DIRECCIÓN
        { wpx: 80 },  // ZONA
        { wpx: 150 }, // MUNICIPIO
        { wpx: 150 }, // DEPARTAMENTO
        { wpx: 100 }, // PAIS
      ];
      

    // **4. AGREGAR DATOS DESDE LA FILA 3**
    datosExcel.forEach((fila, index) => {
        // Formatear fecha en dd/mm/yyyy
        //fila[3] = XLSX.SSF.format('dd/mm/yyyy', fila[3]); 
        XLSX.utils.sheet_add_aoa(ws, [fila], { origin: `A${index + 3}` });
    });

    // **5. CENTRAR COLUMNAS DE EDAD Y GÉNERO**
    ['F', 'G'].forEach(col => {
        for (let row = 3; row <= datosExcel.length + 2; row++) {
            const cellRef = `${col}${row}`;
            if (!ws[cellRef]) ws[cellRef] = {}; // Asegurar celda existente
            ws[cellRef].s = { alignment: { horizontal: 'center' } };
        }
    });

    // **6. AGREGAR FILTROS A LOS ENCABEZADOS**
    ws['!autofilter'] = { ref: `A2:Q${datosExcel.length + 2}` };

    // **7. GUARDAR ARCHIVO**
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, rutaArchivo);
    console.log(`📊 Reporte guardado en ${rutaArchivo}`);
}

// Funcion para descargar adjuntos pdf
function descargarPDF(pdfURL, nombreArchivo, carpetaDestino) {
    return new Promise((resolve, reject) => {
        const modulo = pdfURL.startsWith('https') ? https : http;
        const ruta = path.isAbsolute(carpetaDestino)
            ? carpetaDestino
            : path.join(__dirname, carpetaDestino);

        if (!fs.existsSync(ruta)) {
            fs.mkdirSync(ruta, { recursive: true });
        }

        const filePath = path.join(ruta, nombreArchivo);
        const file = fs.createWriteStream(filePath);

        modulo.get(pdfURL, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Error al descargar: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => resolve(filePath));
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err));
        });
    });
}

// Archivo de sesión
const sesionPath = 'sesion.json';

// Usa la sesión guardada si existe
test.use({ storageState: fs.existsSync(sesionPath) ? sesionPath : undefined });

test('Ejecutar prueba con detección de sesión expirada', async ({ page, context }) => {
    test.setTimeout(0);
    
    // ✅ Recibe DOCUMENTO desde env
    const documento = process.env.DOCUMENTO;
    if (!documento) {
        console.log('❌ No se proporcionó DOCUMENTO');
        test.skip();
        return;
    }
    console.log(`📄 Documento recibido: ${documento}`);

    const nombreArchivo = `Reporte(${obtenerFechaActual()}).xlsx`;
    const carpetaExcel = path.join(__dirname, '..', 'Anexos');

    // Crear la carpeta si no existe
    if (!fs.existsSync(carpetaExcel)) {
        fs.mkdirSync(carpetaExcel, { recursive: true });
        console.log('📁 Carpeta Anexos creada en:', carpetaExcel);
    }
    
    // Ruta completa del archivo
    const rutaArchivo = path.join(carpetaExcel, nombreArchivo);
    
    let datosExcel = [];

    // Ir a la página de inicio
    await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/index.xhtml');

    let sesionActiva = true;

    // **Verificar si la sesión está activa** buscando un elemento clave en la página
    try {
        await page.waitForSelector('text=Información Personal', { timeout: 5000 });
        console.log('✅ Sesión activa, continuando...');
    } catch (error) {
        console.log('🔴 Sesión expirada, volviendo a iniciar sesión...');
        sesionActiva = false;
    }

    // Si la sesión no está activa, iniciar sesión nuevamente
    if (!sesionActiva) {
        await page.getByLabel('Tipo de Documento*').selectOption('38');
        await page.waitForTimeout(3000);
        await page.getByRole('textbox', { name: 'Número de Identificación *' }).click();
        await page.getByRole('textbox', { name: 'Número de Identificación *' }).fill('43575335');
        await page.waitForTimeout(500);
        await page.getByRole('textbox', { name: 'Contraseña *' }).click();
        await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
        await page.getByRole('textbox', { name: 'Contraseña *' }).fill('A');
        await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
        await page.waitForTimeout(500);
        await page.getByRole('textbox', { name: 'Contraseña *' }).fill('Alex8800**12');
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: 'Ingrese' }).click();
        await page.getByRole('cell', { name: 'Seleccione' }).locator('span').click();
        await page.getByRole('cell', { name: 'SERVICIO NACIONAL DE' }).locator('span').click();
        await page.getByRole('button', { name: 'Aceptar' }).click();
        await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/persona/informacionPersonal.xhtml?recursoId=HojaDeVidaSubMenu#no-back-button');

        // Esperar a que cargue el panel de usuario
        await page.waitForSelector('text=Información Personal');

        // Guardar la nueva sesión
        await context.storageState({ path: sesionPath });
        console.log('✅ Nueva sesión guardada en "sesion.json"');
    }

    // Acceder a "Información Personal"
    await page.getByRole('link', { name: 'Información Personal' }).click();
    await page.getByRole('link', { name: 'Información Personal' }).click();
    await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();

    console.log(`📄 Buscando documento: ${documento}`);

    try {
            const capturasTablas = [];
            const soportesNoVerificados = []; 
            const educacionNoVerificada = [];
            const expLaboralNoVerificada = [];
            const expDocenteNoVerificada = [];

            const documentosAdicionalesNoVerificada = [];
            const educacionTrabajoNoVerificada = [];
            const idiomaNoVerificada = [];

            let noVerificados = 0;
            let [, nombreCompleto, tipoDoc, id, fechaNac, correo, genero] = '';
            let edad = '';
            let generoFormato = '';
            let estadoHV = 'No Encontrada';
            let datosPersona = null;
            let datosContacto = null;

            console.log(`📄 No verificados: ${noVerificados}`);
            console.log(`📄 Buscando documento: ${documento}`);
            await page.getByLabel('Tipo de Documento:', { exact: true }).selectOption('38');
            await page.getByRole('textbox', { name: 'Número de Documento:' }).fill(documento);
            await page.getByRole('button', { name: 'Buscar' }).click();

            const verificarBtn = page.getByRole('button', { name: 'Verificar/Aprobar' });

            try {
                await verificarBtn.waitFor({ state: 'visible', timeout: 15000 });
                console.log('📌 Dando clic en "Verificar/Aprobar"...');
                await verificarBtn.click();

                await page.waitForTimeout(2000);

                const modalTexto = page.getByText('ya tiene aprobación de parte suya', { exact: false });
                if (await modalTexto.isVisible()) {
                    console.log('⚠️ Modal detectada. Reversando aprobación...');
                    await page.getByRole('button', { name: 'Continuar' }).click();
                }

                console.log('✅ Hoja de vida abierta correctamente. Continuando proceso...');
                await page.waitForTimeout(3000);

            } catch (error) {
                console.log(`❌ No se encontró el botón "Verificar/Aprobar" para el documento ${documento}`);
                datosExcel.push([documento, 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No encontrado', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido', 'No definido']);
                return; // si no hay botón, no vale la pena seguir intentando este documento
            }

            try {
                const datos = await page.locator('text=Datos Básicos de Identificación').locator('xpath=..').innerText();

                // Si los datos están vacíos, reiniciar sesión
                if (!datos.includes('Tipo de Documento:') || !datos.match(/\d{1,}/)) {
                    console.log('❌ Datos vacíos. Cerrando sesión y reiniciando...');
                    await page.getByRole('link', { name: 'Cerrar Sesión' }).click();
                    await page.waitForTimeout(2000);
                    await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/index.xhtml');
                    
                    // Re-iniciar sesión
                    await page.getByLabel('Tipo de Documento*').selectOption('38');
                    await page.waitForTimeout(3000);
                    await page.getByRole('textbox', { name: 'Número de Identificación *' }).click();
                    await page.getByRole('textbox', { name: 'Número de Identificación *' }).fill('43575335');
                    await page.waitForTimeout(500);
                    await page.getByRole('textbox', { name: 'Contraseña *' }).click();
                    await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
                    await page.getByRole('textbox', { name: 'Contraseña *' }).fill('A');
                    await page.getByRole('textbox', { name: 'Contraseña *' }).press('CapsLock');
                    await page.waitForTimeout(500);
                    await page.getByRole('textbox', { name: 'Contraseña *' }).fill('Alex8800**12');
                    await page.waitForTimeout(3000);
                    await page.getByRole('button', { name: 'Ingrese' }).click();
                    await page.getByRole('cell', { name: 'Seleccione' }).locator('span').click();
                    await page.getByRole('cell', { name: 'SERVICIO NACIONAL DE' }).locator('span').click();
                    await page.getByRole('button', { name: 'Aceptar' }).click();
                    await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/persona/informacionPersonal.xhtml?recursoId=HojaDeVidaSubMenu#no-back-button');

                    // Esperar a que cargue el panel de usuario
                    await page.waitForSelector('text=Información Personal');

                    // Guardar la nueva sesión
                    await context.storageState({ path: sesionPath });
                    console.log('✅ Nueva sesión guardada en "sesion.json"');

                    // Acceder a "Información Personal"
                    await page.getByRole('link', { name: 'Información Personal' }).click();
                    await page.getByRole('link', { name: 'Información Personal' }).click();
                    await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();

                    return; // reintentar el mismo documento
                }

                const match = datos.match(/Datos Básicos de Identificación\n\n\n(.+)\n\n\n\n\nTipo de Documento:\s*(.+)\nNúmero de Identificación:\s*(\d+)\nFecha de Nacimiento:\s*([\d]+ de [a-z]+ del \d+)\nCorreo Electrónico Personal \(Principal\):\s*([^\n]+)\nGénero:\s*(\w+)/i);

                if (match) {
                    
                    [, nombreCompleto, tipoDoc, id, fechaNac, correo, genero] = match;
                    edad = calcularEdad(fechaNac);
                    generoFormato = genero.includes('Masculino') ? 'M' : 'F';

                    datosPersona = {
                        nombre: nombreCompleto,
                        tipoDoc,
                        id,
                        fechaNac,
                        edad,
                        genero: generoFormato,
                        correo
                    };
                }
                
                intentoExitoso = true; // Solo marcamos como exitoso si llegamos aquí sin reiniciar
                
            } catch (error) {
                console.log(`❌ Error obteniendo datos: ${error}`);
            }
        
        
            // Soportes varios
            try {
                let indexGlobal = 0; // Contador global para los índices de filas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Soportes_Varios');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Soportes Varios...');
                    const filas = await page.locator('#frmPrincipal\\:tablaSoporteVarios tbody tr').count();
                    await page.locator('#frmPrincipal\\:tablaSoporteVarios').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_soportes_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'SOPORTES VARIOS',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });

                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        noVerificados ++;
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tablaSoporteVarios tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            noVerificados ++;
                            break;
                        }
                    }
            
                    for (let i = 0; i < filas; i++, indexGlobal++) {
                        console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
            
                        let tipoSoporte = await page.locator(`td:nth-child(1)`).nth(i).textContent();
                        let detalle = await page.locator(`td:nth-child(2)`).nth(i).textContent();

                        // Limpiar texto innecesario
                        tipoSoporte = tipoSoporte?.replace('Tipo de soporte', '').trim();
                        detalle = detalle?.replace('Detalle', '').trim();

            
                        console.log(`🔹 Tipo de soporte: ${tipoSoporte}`);
                        console.log(`🔹 Detalle: ${detalle}`);
            
                        console.log('📌 Abriendo modal del visor de PDF...');
                        await page.locator(`[id="frmPrincipal\\:tablaSoporteVarios\\:${i}\\:j_idt158"]`).click();
                        await page.waitForTimeout(2000);
            
                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_soporte_${indexGlobal}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        const checkBoxLocator = page.locator(`[id="frmPrincipal\\:tablaSoporteVarios\\:${i}\\:j_idt156"] span`);
                        const isCheckedClass = await checkBoxLocator.getAttribute('class');
                        const isChecked = isCheckedClass && isCheckedClass.includes('ui-icon-check');
            
                        if (!(await pdfFrame.isVisible())) {
                            console.log('❌ No se encontró PDF en la modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }

                            soportesNoVerificados.push({
                                tipoSoporte: tipoSoporte.trim(),
                                detalle: detalle.trim(),
                                resultado: 'No se ha subido ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                        
                            continue;
                        }
                        
            
                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }
                            continue;
                        }
            
                        console.log('🔗 URL del PDF:', pdfURL);
            
                        console.log('📌 Abriendo el PDF en nueva pestaña...');
                        const pdfPage = await context.newPage();
                        await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });
            
                        console.log('⏳ Esperando que el PDF cargue completamente...');
                        await pdfPage.waitForTimeout(10000);
            
                        console.log('📸 Tomando captura del PDF...');
                        const SCREENSHOT_PATH = `screenshots/captura_soporte_${indexGlobal}.png`;
                        await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
            
                        console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
            
                        console.log('📤 Enviando imagen a Gemini...');
                        const resultado = await verificarSoportesVarios(SCREENSHOT_PATH, tipoSoporte, detalle);
                        console.log('🔍 Respuesta de Gemini:', resultado);
            
                        console.log('🛑 Cerrando pestaña del PDF...');
                        await pdfPage.close();

                        console.log('📸 Tomando nueva captura antes de cerrar la modal...');
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        console.log(`📸 Captura reemplazada en: ${SCREENSHOT_MODAL_PATH}`);
            
                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Cerrar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();
            
                        
                        if (resultado.includes("Sí coinciden")) {
                            if (!isChecked) {
                                console.log('✅ Coinciden y el checkbox NO está marcado, se marcará.');
                                await checkBoxLocator.click();
                            } else {
                                console.log('☑️ Coinciden y el checkbox ya está marcado, no se toca.');
                            }

                            // Descargar el PDF
            
                            const nombreLimpio = `${indexGlobal}_${tipoSoporte}`.replace(/[^\w\-]/g, '_');
                            const nombreArchivo = `${nombreLimpio}.pdf`;

                            try {
                                const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                console.log(`📥 PDF guardado en: ${rutaFinal}`);
                            } catch (err) {
                                console.log(`❌ Error al descargar el PDF: ${err.message}`);
                            }
                        } else {
                            noVerificados ++;
                            console.log(`📄 No verificados: ${noVerificados}`);
                            if (isChecked) {
                                console.log('⚠️ No coinciden y el checkbox está marcado, no se toca.');
                            } else {
                                console.log('⚠️ No coinciden, el checkbox se marcará.');
                                await checkBoxLocator.click();
                            }
                        
                            // Guardar para generar el PDF más adelante
                            soportesNoVerificados.push({
                                tipoSoporte: tipoSoporte.trim(),
                                detalle: detalle.trim(),
                                resultado: resultado.trim(),
                                imagen: SCREENSHOT_MODAL_PATH,
                                imagenGemini: SCREENSHOT_PATH,
                                horaCaptura: horaCaptura.trim()
                            });
                        }                
                    }
            
                    console.log('📌 Verificando si hay más páginas...');
                    const paginador = page.locator('[id="frmPrincipal\\:tablaSoporteVarios_paginator_bottom"]');
                    const siguienteBtn = paginador.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }
                if (soportesNoVerificados.length > 0) {
                    console.log('🧾 Soportes no verificados acumulados:');
                    console.log(JSON.stringify(soportesNoVerificados, null, 2)); // Mostrar con identación
                } else {
                    console.log('✅ Todos los soportes fueron verificados correctamente, no se generó reporte.');
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
            
            // Educacion formal
            try {
                let indexGlobal = 0;
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Educacion_Formal');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Educación Formal...');
                    const filas = await page.locator('#frmPrincipal\\:tablaEducacionFormal tbody tr').count();
                    await page.locator('#frmPrincipal\\:tablaEducacionFormal').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_educacion_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'EDUCACIÓN',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });

                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        noVerificados ++;
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tablaEducacionFormal tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            noVerificados ++;
                            break;
                        }
                    }

                    for (let i = 0; i < filas; i++, indexGlobal++) {
                        let indexDocumento = 0;
                        console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                        const filaActual = page.locator(`#frmPrincipal\\:tablaEducacionFormal tbody tr`).nth(i);
                        
                        const institucion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Institución/i, '').trim();
                        const titulo = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Título/i, '').trim();
                        const estadoEstudio = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/^Estado Estudio/i, '').trim();
                        const fechaFin = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Fecha Fin/i, '').trim();

                        console.log(`🏫 Institución: ${institucion}`);
                        console.log(`🎓 Título: ${titulo}`);
                        console.log(`📄 Estado de Estudio: ${estadoEstudio}`);
                        console.log(`📅 Fecha de Finalización: ${fechaFin}`);

                        const botonesPDF = [
                            { boton: `#frmPrincipal\\:tablaEducacionFormal\\:${indexGlobal}\\:j_idt173`, columnaVerificada: 5 },
                            { boton: `#frmPrincipal\\:tablaEducacionFormal\\:${indexGlobal}\\:j_idt174`, columnaVerificada: 6 }
                        ];

                        for (const { boton, columnaVerificada } of botonesPDF) {
                            indexDocumento++;
                            console.log('📌 Abriendo modal del visor de PDF...');
                            await page.locator(boton).click();
                            await page.waitForTimeout(2000);

                            console.log('📌 Buscando PDF en la modal...');
                            const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                            const SCREENSHOT_MODAL_PATH = `screenshots/modal_educacion_${indexGlobal}_${indexDocumento}.png`;
                            await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                            const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                            const checkBoxLocator = filaActual.locator(`td:nth-child(${columnaVerificada}) span.ui-chkbox-icon`);
                            const isCheckedClass = await checkBoxLocator.getAttribute('class');
                            const isChecked = isCheckedClass && isCheckedClass.includes('ui-icon-check');

                            if (!(await pdfFrame.isVisible()) && indexDocumento == 1) {
                                console.log('❌ No se encontró PDF en la modal.');
                                await page.getByRole('button', { name: 'Cerrar' }).click();
                                if (!isChecked) {
                                    await checkBoxLocator.click();
                                } else {
                                }
                                
                                educacionNoVerificada.push({
                                    institucion: institucion.trim(),
                                    titulo: titulo.trim(),
                                    estadoEstudio: estadoEstudio.trim(),
                                    fechaFin: fechaFin.trim(),
                                    documento: `Documento ${indexDocumento}`,
                                    resultado: 'No se ha subido ningún documento.',
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: '',
                                    horaCaptura: horaCaptura.trim()
                                });
                                
                                continue;
                            }
                            if (!(await pdfFrame.isVisible()) && indexDocumento == 2) {
                                console.log('❌ No se encontró PDF en la modal.');
                                noVerificados ++;
                                await page.getByRole('button', { name: 'Cerrar' }).click();
                                if (!isChecked) {
                                    await checkBoxLocator.click();
                                } else {
                                }

                                educacionNoVerificada.push({
                                    institucion: institucion.trim(),
                                    titulo: titulo.trim(),
                                    estadoEstudio: estadoEstudio.trim(),
                                    fechaFin: fechaFin.trim(),
                                    documento: `Documento ${indexDocumento}`,
                                    resultado: 'No se ha subido ningún documento.',
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: '',
                                    horaCaptura: horaCaptura.trim()
                                });
                                
                                continue;
                            }

                            const pdfURL = await pdfFrame.getAttribute('src');
                            if (!pdfURL) {
                                console.log('❌ No se pudo obtener la URL del PDF.');
                                noVerificados ++;
                                await page.getByRole('button', { name: 'Cerrar' }).click();
                                if (!isChecked) {
                                    await checkBoxLocator.click();
                                } else {
                                }
                                continue;
                            }

                            console.log('🔗 URL del PDF:', pdfURL);

                            console.log('📌 Abriendo el PDF en nueva pestaña...');
                            const pdfPage = await context.newPage();
                            await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });

                            console.log('⏳ Esperando que el PDF cargue completamente...');
                            await pdfPage.waitForTimeout(10000);

                            console.log('📸 Tomando captura del PDF...');
                            const SCREENSHOT_PATH = `screenshots/captura_pdf_${indexGlobal}_${columnaVerificada}.png`;
                            await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

                            console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);

                            console.log('📤 Enviando imagen a Gemini...');
                            const resultado = await verificarEducacionFormal(SCREENSHOT_PATH, titulo, institucion);
                            console.log('🔍 Respuesta de Gemini:', resultado);

                            console.log('🛑 Cerrando pestaña del PDF...');
                            await pdfPage.close();

                            console.log('📸 Tomando nueva captura antes de cerrar la modal...');
                            await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                            console.log(`📸 Captura reemplazada en: ${SCREENSHOT_MODAL_PATH}`);
            

                            console.log('🛑 Intentando cerrar modal...');

                            async function cerrarModal() {
                            for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                                const botonCerrar = page.getByRole('button', { name: 'Cerrar' });
                                const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                                if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                                } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                                }
                            }
                            
                            console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                            }

                            await cerrarModal();

                            
                            if (resultado.includes("Sí coinciden")) {
                                if (!isChecked) {
                                    console.log('✅ Coinciden y el checkbox NO está marcado, se marcará.');
                                    await checkBoxLocator.click();
                                } else {
                                    console.log('☑️ Coinciden y el checkbox ya está marcado, no se toca.');
                                }

                                // Descargar el PDF
                                const nombreLimpio = `${indexGlobal}_${titulo}`.replace(/[^\w\-]/g, '_');
                                const nombreArchivo = `${nombreLimpio}.pdf`;

                                try {
                                    const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                    console.log(`📥 PDF guardado en: ${rutaFinal}`);
                                } catch (err) {
                                    console.log(`❌ Error al descargar el PDF: ${err.message}`);
                                }
                            } else {
                                noVerificados ++;
                                console.log(`📄 No verificados: ${noVerificados}`);
                                if (isChecked) {
                                    console.log('⚠️ No coinciden y el checkbox está marcado, se desmarcará.');
                                } else {
                                    console.log('⚠️ No coinciden, el checkbox no se marcará ni modificará.');
                                    await checkBoxLocator.click();
                                }
                                educacionNoVerificada.push({
                                    institucion: institucion.trim(),
                                    titulo: titulo.trim(),
                                    estadoEstudio: estadoEstudio.trim(),
                                    fechaFin: fechaFin.trim(),
                                    documento: `Documento ${indexDocumento}`,
                                    resultado: resultado.trim(),
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: SCREENSHOT_PATH,
                                    horaCaptura: horaCaptura.trim()

                                });
                            }
                        }
                    }

                    console.log('📌 Verificando si hay más páginas...');
                    const paginador = page.locator('[id="frmPrincipal\\:tablaEducacionFormal_paginator_bottom"]');
                    const siguienteBtn = paginador.getByRole('link', { name: 'Next Page' });

                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');

                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }
                if (educacionNoVerificada.length > 0) {
                    console.log('🧾 Educacion no verificada acumulada:');
                    console.log(JSON.stringify(educacionNoVerificada, null, 2)); // Mostrar con identación
                } else {
                    console.log('✅ Todos los soportes fueron verificados correctamente, no se generó reporte.');
                } 
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Experiencia Laboral
            try {
                let filaIndex = 0; // Variable global para contar todas las filas procesadas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Experiencia_Laboral');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Experiencia Laboral...');
                    const filas = await page.locator('#frmPrincipal\\:tablaExperienciaLaboral tbody tr').count();
                    await page.locator('#frmPrincipal\\:tablaExperienciaLaboral').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_expLaboral_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'EXPERIENCIA LABORAL',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });

                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        noVerificados ++;
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tablaExperienciaLaboral tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            noVerificados ++;
                            break;
                        }
                    }
            
                    for (let i = 0; i < filas; i++, filaIndex++) { // filaIndex sigue aumentando
                        console.log(`📌 Procesando fila ${filaIndex + 1}...`);
                        const filaActual = page.locator(`#frmPrincipal\\:tablaExperienciaLaboral tbody tr`).nth(i);
            
                        const entidad = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Entidad/i, '').trim();
                        const cargo = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Cargo/i, '').trim();
                        const fechaIngreso = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Fecha Ingreso/i, '').trim();
            
                        console.log(`🏢 Entidad: ${entidad}`);
                        console.log(`💼 Cargo: ${cargo}`);
                        console.log(`📅 Fecha de Ingreso: ${fechaIngreso}`);
            
                        const botonPDF = `#frmPrincipal\\:tablaExperienciaLaboral\\:${filaIndex}\\:j_idt191`;
            
                        console.log('📌 Abriendo modal del visor de PDF...');
                        await page.locator(botonPDF).click();
                        await page.waitForTimeout(2000);
            
                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_laboral_${filaIndex}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        const checkBoxLocator = filaActual.locator(`td:nth-child(7) span.ui-chkbox-icon`);
                        const isCheckedClass = await checkBoxLocator.getAttribute('class');
                        const isChecked = isCheckedClass && isCheckedClass.includes('ui-icon-check');

                        if (!(await pdfFrame.isVisible())) {
                            console.log('❌ No se encontró PDF en la modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }
                            
                            expLaboralNoVerificada.push({
                                entidad: entidad.trim(),
                                cargo: cargo.trim(),
                                fechaIngreso: fechaIngreso.trim(),
                                resultado: 'No se ha subido ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });

                            continue;
                        }
            
                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }
                            continue;
                        }
            
                        console.log('🔗 URL del PDF:', pdfURL);
            
                        console.log('📌 Abriendo el PDF en nueva pestaña...');
                        const pdfPage = await context.newPage();
                        await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });
            
                        console.log('⏳ Esperando que el PDF cargue completamente...');
                        await pdfPage.waitForTimeout(10000);
            
                        console.log('📸 Tomando captura del PDF...');
                        const SCREENSHOT_PATH = `screenshots/captura_pdf_${filaIndex}.png`;
                        await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
            
                        console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
            
                        console.log('📤 Enviando imagen a Gemini...');
                        const resultado = await verificarExperienciaLaboral(SCREENSHOT_PATH, entidad, cargo, fechaIngreso);
                        console.log('🔍 Respuesta de Gemini:', resultado);
            
                        console.log('🛑 Cerrando pestaña del PDF...');
                        await pdfPage.close();

                        console.log('📸 Tomando nueva captura antes de cerrar la modal...');
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        console.log(`📸 Captura reemplazada en: ${SCREENSHOT_MODAL_PATH}`);
            
                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Cerrar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();
            
                        if (resultado.includes("Sí coinciden")) {
                            if (!isChecked) {
                                console.log('✅ Coinciden y el checkbox NO está marcado, se marcará.');
                                await checkBoxLocator.click();
                            } else {
                                console.log('☑️ Coinciden y el checkbox ya está marcado, no se toca.');
                            }

                            // Descargar el PDF
                            const nombreLimpio = `${filaIndex}_${cargo}`.replace(/[^\w\-]/g, '_');
                            const nombreArchivo = `${nombreLimpio}.pdf`;

                            try {
                                const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                console.log(`📥 PDF guardado en: ${rutaFinal}`);
                            } catch (err) {
                                console.log(`❌ Error al descargar el PDF: ${err.message}`);
                            }
                        } else {
                            noVerificados ++;
                            if (isChecked) {
                                console.log('⚠️ No coinciden y el checkbox está marcado, se desmarcará.');
                            } else {
                                console.log('⚠️ No coinciden, el checkbox no se marcará ni modificará.');
                                await checkBoxLocator.click();
                            }

                            expLaboralNoVerificada.push({
                                entidad: entidad.trim(),
                                cargo: cargo.trim(),
                                fechaIngreso: fechaIngreso.trim(),
                                resultado: resultado.trim(),
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: SCREENSHOT_PATH,
                                horaCaptura: horaCaptura.trim()
                            });
                        }
                    }
            
                    console.log('📌 Verificando si hay más páginas...');
                    const paginador = page.locator('[id="frmPrincipal\\:tablaExperienciaLaboral_paginator_bottom"]');
                    const siguienteBtn = paginador.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }
                if (expLaboralNoVerificada.length > 0) {
                    console.log('🧾 Experiencia laboral no verificada acumulada:');
                    console.log(JSON.stringify(expLaboralNoVerificada, null, 2)); // Mostrar con identación
                } else {
                    console.log('✅ Todos los soportes fueron verificados correctamente, no se generó reporte.');
                }  
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
            
            // Experiencia laboral docente
            try {
                let filaIndex = 0; // Contador global de filas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Experiencia_Docente');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log(`Pagina ${indexPagina}`);
                    console.log('📌 Obteniendo filas de la tabla Experiencia Laboral Docente...');
                    const filas = await page.locator('#frmPrincipal\\:tablaExperienciaLaboralDocente tbody tr').count();
                    await page.locator('#frmPrincipal\\:tablaExperienciaLaboralDocente').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_expDocente_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'EXPERIENCIA DOCENTE',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
                    
                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        noVerificados ++;
                        
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tablaExperienciaLaboralDocente tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            noVerificados ++;
                            break;
                        }
                    }
            
                    for (let i = 0; i < filas; i++, filaIndex++) {
                        console.log(`📌 Procesando fila ${filaIndex + 1}...`);
                        const filaActual = page.locator('#frmPrincipal\\:tablaExperienciaLaboralDocente tbody tr').nth(i);
            
                        const institucion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Institución Educativa/i, '').trim();
                        let areaConocimiento = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Área Conocimiento/i, '').trim();
                        const fechaIngreso = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/^Fecha Ingreso/i, '').trim();

            
                        console.log(`🏫 Institución: ${institucion}`);
                        console.log(`📅 Fecha de Ingreso: ${fechaIngreso}`);
            
                        const botonPDF = `#frmPrincipal\\:tablaExperienciaLaboralDocente\\:${filaIndex}\\:j_idt206`;
                        console.log('📌 Abriendo modal del visor de PDF...');
                        await page.locator(botonPDF).click();
                        await page.waitForTimeout(2000);
            
                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_docente_${filaIndex}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        const checkBoxLocator = filaActual.locator('td:nth-child(6) span.ui-chkbox-icon');
                        const isCheckedClass = await checkBoxLocator.getAttribute('class');
                        const isChecked = isCheckedClass && isCheckedClass.includes('ui-icon-check');

                        if (!(await pdfFrame.isVisible())) {
                            console.log('❌ No se encontró PDF en la modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }

                            expDocenteNoVerificada.push({
                                institucion: institucion.trim(),
                                fechaIngreso: fechaIngreso.trim(),
                                resultado: 'No se ha subido ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });

                            continue;
                        }
            
                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Cerrar' }).click();
                            if (!isChecked) {
                                await checkBoxLocator.click();
                            } else {
                            }
                            continue;
                        }
            
                        console.log('🔗 URL del PDF:', pdfURL);
                        console.log('📌 Abriendo el PDF en nueva pestaña...');
                        const pdfPage = await context.newPage();
                        await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });
                        await pdfPage.waitForTimeout(10000);
            
                        console.log('📸 Tomando captura del PDF...');
                        const SCREENSHOT_PATH = `screenshots/captura_pdf_docente_${filaIndex}.png`;
                        await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
            
                        console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
                        console.log('📤 Enviando imagen a Gemini...');
                        const resultado = await verificarExperienciaLaboralDocente(SCREENSHOT_PATH, institucion, fechaIngreso);
                        console.log('🔍 Respuesta de Gemini:', resultado);
            
                        console.log('🛑 Cerrando pestaña del PDF...');
                        await pdfPage.close();

                        console.log('📸 Tomando nueva captura antes de cerrar la modal...');
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        console.log(`📸 Captura reemplazada en: ${SCREENSHOT_MODAL_PATH}`);

                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Cerrar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();
            
                        if (resultado.includes('Sí coinciden')) {
                            if (!isChecked) {
                                console.log('✅ Coinciden y el checkbox NO está marcado, se marcará.');
                                await checkBoxLocator.click();
                            } else {
                                console.log('☑️ Coinciden y el checkbox ya está marcado, no se toca.');
                            }

                            // Descargar el PDF
                            const nombreLimpio = `${filaIndex}_${areaConocimiento}`.replace(/[^\w\-]/g, '_');
                            const nombreArchivo = `${nombreLimpio}.pdf`;

                            try {
                                const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                console.log(`📥 PDF guardado en: ${rutaFinal}`);
                            } catch (err) {
                                console.log(`❌ Error al descargar el PDF: ${err.message}`);
                            }
                        } else {
                            noVerificados ++;
                            if (isChecked) {
                                console.log('⚠️ No coinciden y el checkbox está marcado, se desmarcará.');
                            } else {
                                console.log('⚠️ No coinciden, el checkbox no se marcará ni modificará.');
                                await checkBoxLocator.click();
                            }

                            expDocenteNoVerificada.push({
                                institucion: institucion.trim(),
                                fechaIngreso: fechaIngreso.trim(),
                                resultado: resultado.trim(),
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: SCREENSHOT_PATH,
                                horaCaptura: horaCaptura.trim()                            
                            });
                        }
                    }
            
                    console.log('📌 Verificando si hay más páginas...');
                    const paginador = page.locator('[id="frmPrincipal\\:tablaExperienciaLaboralDocente_paginator_bottom"]');
                    const siguienteBtn = paginador.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }
                if (expDocenteNoVerificada.length > 0) {
                    console.log('🧾 Experiencia docente No Verificada:');
                    console.log(JSON.stringify(expDocenteNoVerificada, null, 2)); // Mostrar con identación
                } else {
                    console.log('✅ Todos los soportes fueron verificados correctamente, no se generó reporte.');
                }  
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
        
            console.log('\n📘 SOPORTES VARIOS:');
            console.table(soportesNoVerificados);

            console.log('\n📙 EDUCACIÓN:');
            console.table(educacionNoVerificada);

            console.log('\n📗 EXPERIENCIA LABORAL:');
            console.table(expLaboralNoVerificada);

            console.log('\n📕 EXPERIENCIA DOCENTE:');
            console.table(expDocenteNoVerificada);
            
            await page.getByRole('button', { name: 'Guardar' }).click();
            await page.getByRole('button', { name: 'Aceptar' }).click();

            // await page.getByRole('button', { name: 'Aprobar' }).click();
            // await page.getByRole('button', { name: 'Aprobar' }).click();
            // await page.getByRole('button', { name: 'Aceptar' }).click();
            
            // Condicional para aprobar si todo esta correcto
            // if (noVerificados > 0) {
            //     console.log('❌ La hoja de vida NO puede ser aprobada. Hay elementos no verificados.');
            //     //Boton para guardar 
            //     await page.getByRole('button', { name: 'Guardar' }).click();
            //     await page.getByRole('button', { name: 'Aceptar' }).click();
            // } else {
            //     console.log('✅ La hoja de vida PUEDE ser aprobada. Todos los elementos están verificados.');
            //     //Boton para aprobar
            //     await page.getByRole('button', { name: 'Aprobar' }).click();
            //     await page.getByRole('button', { name: 'Aprobar' }).click();
            //     await page.getByRole('button', { name: 'Aceptar' }).click();
            // }

            console.log(`📄 Volviendo a buscar el documento: ${documento}`);
            await page.getByLabel('Tipo de Documento:', { exact: true }).selectOption('38');
            await page.getByRole('textbox', { name: 'Número de Documento:' }).fill(documento);
            await page.getByRole('button', { name: 'Buscar' }).click();

            const verDetalle = page.getByRole('button', { name: 'Ver Detalle' });
            try {
                await verDetalle.waitFor({ state: 'visible', timeout: 10000 });
                console.log('📌 Dando clic en "Ver Detalle"...');
                await verDetalle.click();

                await page.waitForTimeout(2000);

                console.log('✅ Hoja de vida abierta correctamente. Continuando proceso...');
                await page.waitForTimeout(5000);

            } catch (error) {
                console.log(`❌ No se encontró el botón "Ver Detalle" para el documento ${documento}`);
                return; // si no hay botón, no vale la pena seguir intentando este documento
            }

            await page.getByRole('link', { name: 'Datos de Contacto' }).click();

            // Obtener valores usando el label o role, como indica codegen
            const pais = await page.getByLabel('País de Residencia :').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
            const departamento = await page.getByLabel('Departamento:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
            const municipio = await page.getByLabel('Municipio:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
            const tipoZona = await page.getByLabel('Tipo de Zona:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
            const direccion = await page.getByRole('textbox', { name: 'Ingrese Dirección de' }).inputValue();
            const telefonoResidenciaIndicativo = await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabView\\:telefonoResidenciaIndicativo"]').innerText();
            const telefonoResidencia = await page.getByRole('textbox', { name: 'Teléfono de Residencia:' }).inputValue();
            const celular = await page.getByRole('textbox', { name: 'Teléfono Celular:' }).inputValue();
            const indicativoOficina = await page.getByRole('textbox', { name: 'Ingrese Indicativo de Tipo' }).inputValue();
            const telefonoOficina = await page.getByRole('textbox', { name: 'Teléfono Oficina: ' }).inputValue();
            const extension = await page.getByRole('textbox', { name: 'Ext.' }).inputValue();
            const correoOficina = await page.getByRole('textbox', { name: 'Correo Electrónico Oficina:' }).inputValue();

            // Concatenar teléfonos
            const telefonoCompletoResidencia = `${telefonoResidenciaIndicativo} ${telefonoResidencia}`;
            const telefonoCompletoOficina = `${indicativoOficina} ${telefonoOficina} Ext. ${extension}`;

            





            // Documentos Adicionales
            await page.getByRole('link', { name: 'Documentos Adicionales' }).click();
            await page.waitForTimeout(2000);
            await page.waitForSelector('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr');
            try {
                let indexGlobal = 0; // Contador global para los índices de filas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';
                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Documentos_Adicionales');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Documentos Adicionales...');
                    const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr').count();
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_docAdicionales_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'DOCUMENTOS ADICIONALES',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        break;
                    }

                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr td').first().textContent();
                        console.log('📄 Contenido de la única fila:', textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales.');
                            break;
                        }
                    }
                    
                    for (let i = 0; i < filas; i++, indexGlobal++) {
                        console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                        
                        const tablaIdiomas = page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabAdicionales"] table');
                        const filaTablaActual = tablaIdiomas.locator('tbody tr');
                        let tipoDocumento = await filaTablaActual.nth(i).locator('td:nth-child(1)').textContent();
                        let descripcion = await filaTablaActual.nth(i).locator('td:nth-child(2)').textContent();

                        tipoDocumento = tipoDocumento?.replace('Tipo Documento', '').trim();
                        descripcion = tipoDocumento?.replace('Descripción', '').trim();
                        console.log(`🔹 Tipo Documento: ${tipoDocumento}`);
                        console.log(`🔹 Descripción: ${descripcion}}`);

                        const botonVer = page.locator(`[id="frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales\\:${indexGlobal}\\:btnVerDocumentosAdicionalHV"]`);

                        const visible = await botonVer.isVisible();
                        console.log(`🕹️ Botón "Ver Documento" visible: ${visible}`);

                        console.log('📌 Abriendo modal del visor de PDF...');
                        await botonVer.click();
                        await page.waitForTimeout(2000);

                        await page.waitForFunction(() => {
                            const modales = document.querySelectorAll('.modal-body');
                            return Array.from(modales).some(m => window.getComputedStyle(m).display !== 'none');
                        }, { timeout: 10000 });
                        

                        console.log('📌 Buscando visor PDF en los modales...');
                        const modales = await page.locator('.modal-body').all();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_adicionales_${indexGlobal}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        let modalConVisor = null;
                        let visorPDF = null;

                        for (const modal of modales) {
                            const isVisible = await modal.isVisible();
                            const visor = modal.locator('iframe, embed');

                            if (isVisible && await visor.count() > 0 && await visor.first().isVisible()) {
                                visorPDF = visor.first();
                                modalConVisor = modal;
                                break;
                            }                            
                        }



                        if (!visorPDF) {
                            console.log('❌ No se encontró visor PDF en ningún modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Aceptar' }).click();

                            documentosAdicionalesNoVerificada.push({
                                tipoDocumento: tipoDocumento.trim(),
                                descripcion: descripcion.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });

                            continue;
                        }


                        // Verificamos existencia de modal
                        const modalVisible = await modalConVisor?.isVisible();
                        console.log(`🧭 Modal visible: ${modalVisible}`);

                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();

                        const existePDF = await pdfFrame.count();
                        console.log(`🔍 ¿Se encontró algún iframe/embed en la modal? ${existePDF > 0 ? 'Sí' : 'No'}`);

                        // Esperar que el iframe/embed tenga un src asignado
                        await page.waitForFunction(() => {
                            const frame = document.querySelector('.modal-body iframe, .modal-body embed');
                            return frame && frame.getAttribute('src') && frame.getAttribute('src') !== '';
                        }, { timeout: 10000 });

                        // Verificamos si el PDF realmente está visible
                        const style = await pdfFrame.evaluate(el => {
                            const computed = window.getComputedStyle(el);
                            return {
                                display: computed.display,
                                visibility: computed.visibility,
                                opacity: computed.opacity,
                            };
                        });
                        console.log('🎨 Estilos del PDF:', style);

                        // Alternativa de visibilidad usando dimensiones reales
                        const isFullyVisible = await pdfFrame.evaluate(el => {
                            function isVisibleRecursive(element) {
                                if (!element) return false;
                        
                                const style = window.getComputedStyle(element);
                                const rect = element.getBoundingClientRect();
                        
                                const visibleByStyle = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                                const hasSize = rect.width > 0 && rect.height > 0;
                        
                                if (!visibleByStyle || !hasSize) return false;
                        
                                const parent = element.parentElement;
                                if (parent && parent !== document.body) {
                                    return isVisibleRecursive(parent);
                                }
                        
                                return true;
                            }
                        
                            return isVisibleRecursive(el);
                        });
                        console.log(`👀 ¿PDF realmente visible (verificando padres)? ${isFullyVisible}`);

                        if (!isFullyVisible) {
                            console.log('❌ No se encontró PDF visible en la modal (con método alternativo).');
                            noVerificados ++;
                            documentosAdicionalesNoVerificada.push({
                                tipoDocumento: tipoDocumento.trim(),
                                descripcion: descripcion.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            await page.getByRole('button', { name: 'Aceptar' }).click();
                            continue;
                        }


                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            documentosAdicionalesNoVerificada.push({
                                tipoDocumento: tipoDocumento.trim(),
                                descripcion: descripcion.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            await page.getByRole('button', { name: 'Aceptar' }).click();
                            continue;
                        }

                        console.log('🔗 URL del PDF:', pdfURL);

                        let pdfDisponible = true;
                        let pdfPage;
                        let SCREENSHOT_PATH;
                        let resultado;

                        try {
                            console.log('📌 Abriendo el PDF en nueva pestaña...');
                            pdfPage = await context.newPage();

                            const response = await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });

                            if (!response || response.status() === 404) {
                                console.log(`❌ PDF no disponible (status ${response?.status() ?? 'desconocido'})`);
                                noVerificados ++;
                                documentosAdicionalesNoVerificada.push({
                                    tipoDocumento: tipoDocumento.trim(),
                                    descripcion: descripcion.trim(),
                                    resultado: 'No se ha encontrado ningún documento.',
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: '',
                                    horaCaptura: horaCaptura.trim()
                                });
                                pdfDisponible = false;
                            } else {
                                console.log('⏳ Esperando que el PDF cargue completamente...');
                                await pdfPage.waitForTimeout(10000);
            
                                console.log('📸 Tomando captura del PDF...');
                                SCREENSHOT_PATH = `screenshots/captura_adicionales_${indexGlobal}.png`;
                                await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
                    
                                console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
                    
                                console.log('📤 Enviando imagen a Gemini...');
                                resultado = await verificarDocumentosAdicionales(SCREENSHOT_PATH, tipoDocumento, descripcion);
                                console.log('🔍 Respuesta de Gemini:', resultado);

                                if (resultado.includes("Sí coinciden")) {
                                    if (pdfDisponible) {
                                        const nombreLimpio = `${indexGlobal}_${tipoDocumento}`.replace(/[^\w\-]/g, '_');
                                        const nombreArchivo = `${nombreLimpio}.pdf`;
        
                                        try {
                                            const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                            console.log(`📥 PDF guardado en: ${rutaFinal}`);
                                        } catch (err) {
                                            console.log(`❌ Error al descargar el PDF: ${err.message}`);
                                        }
                                    } else {
                                        console.log('⚠️ PDF no descargado porque no está disponible.');
                                    }
                                } else {
                                    noVerificados ++;
                                    console.log(`📄 No verificados: ${noVerificados}`);
                                
                                    // Guardar para generar el PDF más adelante
                                    documentosAdicionalesNoVerificada.push({
                                        tipoDocumento: tipoDocumento.trim(),
                                        descripcion: descripcion.trim(),
                                        resultado: resultado.trim(),
                                        imagenPath: SCREENSHOT_MODAL_PATH,
                                        imagenGemini: SCREENSHOT_PATH,
                                        horaCaptura: horaCaptura.trim()
                                    });
                                }  
                            }
                        } catch (error) {
                            console.log('❌ Error al abrir el PDF:', error.message);
                            noVerificados ++;
                            documentosAdicionalesNoVerificada.push({
                                tipoDocumento: tipoDocumento.trim(),
                                descripcion: descripcion.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            pdfDisponible = false;
                        } finally {
                            if (pdfPage) {
                                console.log('🛑 Cerrando pestaña del PDF...');
                                await pdfPage.close();
                            }
                        }

                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Aceptar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();

                          
                    }

                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });

                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');

                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }

            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
            console.log('\n📘 Documentos Adicionales:');
            console.table(documentosAdicionalesNoVerificada);

            await page.getByRole('link', { name: 'Educación' }).click();

            // Educacion para el trabajo y el desarrollo humano
            await page.getByRole('link', { name: 'Educación para el Trabajo y' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexGlobal = 0; // Contador global para los índices de filas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Educacion_Trabajo');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Educacion para el trabajo...');
                    const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano tbody tr').count();
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_eduTrabajo_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'EDUCACIÓN PARA EL TRABAJO',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            break;
                        }
                    }
            
                    for (let i = 0; i < filas; i++, indexGlobal++) {
                        console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
            
                        const tablaOtroConocimiento = page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:panelOtroConocimiento_content"] table');
                        const filas = tablaOtroConocimiento.locator('tbody tr');
                        // Por ejemplo, obtener el texto de la columna "Curso" (2da columna)
                        let institucion = await filas.nth(i).locator('td:nth-child(1)').textContent();
                        let curso = await filas.nth(i).locator('td:nth-child(2)').textContent();
                        let fecha = await filas.nth(i).locator('td:nth-child(5)').textContent();

                        // Limpiar texto innecesario
                        institucion = curso?.replace('Institución', '').trim();
                        curso = curso?.replace('Curso', '').trim();
                        fecha = curso?.replace('Fecha de Terminación', '').trim();
            
                        console.log(`🔹 Institución: ${institucion}`);
                        console.log(`🔹 Curso: ${curso}`);
                        console.log(`🔹 Fecha de Terminación: ${fecha}`);
            
                        console.log('📌 Abriendo modal del visor de PDF...');
                        await page.locator(`[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano\\:${indexGlobal}\\:btnVerDocumentosOtroConocimientoHV"]`).click();
                        await page.waitForTimeout(2000);
            
                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_edTrabajo_${indexGlobal}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        if (!(await pdfFrame.isVisible())) {
                            console.log('❌ No se encontró PDF en la modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Aceptar' }).click();
                            
                            educacionTrabajoNoVerificada.push({
                                institucion: institucion.trim(),
                                curso: curso.trim(),
                                fecha: fecha.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });

                            continue;
                        }
                        
            
                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            educacionTrabajoNoVerificada.push({
                                institucion: institucion.trim(),
                                curso: curso.trim(),
                                fecha: fecha.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            await page.getByRole('button', { name: 'Aceptar' }).click();
                            continue;
                        }
            
                        console.log('🔗 URL del PDF:', pdfURL);

                        let pdfDisponible = true;
                        let pdfPage;
                        let SCREENSHOT_PATH;
                        let resultado;

                        try {
                            console.log('📌 Abriendo el PDF en nueva pestaña...');
                            pdfPage = await context.newPage();

                            const response = await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });

                            if (!response || response.status() === 404) {
                                console.log(`❌ PDF no disponible (status ${response?.status() ?? 'desconocido'})`);
                                noVerificados ++;
                                educacionTrabajoNoVerificada.push({
                                    institucion: institucion.trim(),
                                    curso: curso.trim(),
                                    fecha: fecha.trim(),
                                    resultado: 'No se ha encontrado ningún documento.',
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: '',
                                    horaCaptura: horaCaptura.trim()
                                });
                                pdfDisponible = false;
                            } else {
                                console.log('⏳ Esperando que el PDF cargue completamente...');
                                await pdfPage.waitForTimeout(10000);
            
                                console.log('📸 Tomando captura del PDF...');
                                SCREENSHOT_PATH = `screenshots/captura_edTrabajo_${indexGlobal}.png`;
                                await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
                    
                                console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
                    
                                console.log('📤 Enviando imagen a Gemini...');
                                resultado = await verificarEducacionTrabajo(SCREENSHOT_PATH, institucion, curso, fecha);
                                console.log('🔍 Respuesta de Gemini:', resultado);

                                if (resultado.includes("Sí coinciden")) {
                                    // Si el PDF está disponible, intenta descargarlo
                                    if (pdfDisponible) {
                                        const nombreLimpio = `${indexGlobal}_${curso}`.replace(/[^\w\-]/g, '_');
                                        const nombreArchivo = `${nombreLimpio}.pdf`;
        
                                        try {
                                            const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                            console.log(`📥 PDF guardado en: ${rutaFinal}`);
                                        } catch (err) {
                                            console.log(`❌ Error al descargar el PDF: ${err.message}`);
                                        }
                                    } else {
                                        console.log('⚠️ PDF no descargado porque no está disponible.');
                                    }   
                                } else {
                                    noVerificados ++;
                                    console.log(`📄 No verificados: ${noVerificados}`);
                                
                                    // Guardar para generar el PDF más adelante
                                    educacionTrabajoNoVerificada.push({
                                        institucion: institucion.trim(),
                                        curso: curso.trim(),
                                        fecha: fecha.trim(),
                                        resultado: resultado.trim(),
                                        imagenPath: SCREENSHOT_MODAL_PATH,
                                        imagenGemini: SCREENSHOT_PATH,
                                        horaCaptura: horaCaptura.trim()
                                    });
                                }   
                    
                            }
                        } catch (error) {
                            console.log('❌ Error al abrir el PDF:', error.message);
                            noVerificados ++;
                            educacionTrabajoNoVerificada.push({
                                institucion: institucion.trim(),
                                curso: curso.trim(),
                                fecha: fecha.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            pdfDisponible = false;
                        } finally {
                            if (pdfPage) {
                                console.log('🛑 Cerrando pestaña del PDF...');
                                await pdfPage.close();
                            }
                        }

                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Aceptar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();

                        
                    }
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
            
            // Idiomas
            await page.getByRole('link', { name: 'Idiomas' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexGlobal = 0; // Contador global para los índices de filas
                let indexPagina = 0;

                // ✅ Definir carpeta destino usando datosPersona
                let carpetaDestino = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`, 'Idiomas');
                    if (!fs.existsSync(carpetaDestino)) {
                        fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                while (true) {
                    indexPagina ++;
                    console.log('📌 Obteniendo filas de la tabla Idiomas...');
                    const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas tbody tr').count();
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_idiomas_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'IDIOMAS',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
                    if (filas === 0) {
                        console.log('❌ No hay más filas en la tabla.');
                        break;
                    }

                    // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                    if (filas === 1) {
                        const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas tbody tr td').first().textContent();
                        console.log(textoFila);
                        if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                            console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                            break;
                        }
                    }
            
                    for (let i = 0; i < filas; i++, indexGlobal++) {
                        console.log(`📌 Procesando fila ${indexGlobal + 1}...`);

            
                        const tablaIdiomas = page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:panelIdiomas_content"] table');
                        const filas = tablaIdiomas.locator('tbody tr');
                        let lenguaje = await filas.nth(i).locator('td:nth-child(1)').textContent();
                        let checkbox = filas.nth(i).locator('td:nth-child(5) input[type="checkbox"]');
                        let nativa = await checkbox.isChecked();
                        
                        // Limpiar texto innecesario
                        lenguaje = lenguaje?.replace('Lenguaje', '').trim();
            
                        console.log(`🔹 Lenguaje: ${lenguaje}`);
                        console.log(`Lengua nativa: ${nativa}`);

            
                        console.log('📌 Abriendo modal del visor de PDF...');
                        await page.locator(`[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas\\:${indexGlobal}\\:btnVerDocumentosIdiomaHV"]`).click();
                        await page.waitForTimeout(2000);
            
                        console.log('📌 Buscando PDF en la modal...');
                        const pdfFrame = await page.locator('.modal-body iframe, .modal-body embed').first();
                        const SCREENSHOT_MODAL_PATH = `screenshots/modal_idiomas_${indexGlobal}.png`;
                        await page.screenshot({ path: SCREENSHOT_MODAL_PATH});
                        const horaCaptura = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;

                        if (!(await pdfFrame.isVisible()) && !nativa) {
                            console.log('❌ No se encontró PDF en la modal.');
                            noVerificados ++;
                            await page.getByRole('button', { name: 'Aceptar' }).click();

                            idiomaNoVerificada.push({
                                lenguaje: lenguaje.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                        
                            continue;
                        }
                        
            
                        const pdfURL = await pdfFrame.getAttribute('src');
                        if (!pdfURL) {
                            console.log('❌ No se pudo obtener la URL del PDF.');
                            noVerificados ++;
                            idiomaNoVerificada.push({
                                lenguaje: lenguaje.trim(),
                                resultado: 'No se ha encontrado ningún documento.',
                                imagenPath: SCREENSHOT_MODAL_PATH,
                                imagenGemini: '',
                                horaCaptura: horaCaptura.trim()
                            });
                            await page.getByRole('button', { name: 'Aceptar' }).click();
                            continue;
                        }
            
                        console.log('🔗 URL del PDF:', pdfURL);

                        let pdfDisponible = true;
                        let pdfPage;
                        let SCREENSHOT_PATH;
                        let resultado;

                        try {
                            console.log('📌 Abriendo el PDF en nueva pestaña...');
                            pdfPage = await context.newPage();
                        
                            const response = await pdfPage.goto(pdfURL, { waitUntil: 'networkidle' });
                        
                            if (!response || !response.ok()) {
                                const status = response?.status();
                        
                                if (!nativa) {
                                    console.log(`❌ PDF no disponible (status ${status ?? 'desconocido'})`);
                                    noVerificados++;
                                    idiomaNoVerificada.push({
                                        lenguaje: lenguaje.trim(),
                                        resultado: 'No se ha encontrado ningún documento.',
                                        imagenPath: SCREENSHOT_MODAL_PATH,
                                        imagenGemini: '',
                                        horaCaptura: horaCaptura.trim()
                                    });
                                } else {
                                    console.log('No hay pdf por ser lengua nativa');
                                }
                        
                                pdfDisponible = false;
                            } else {
                                console.log('⏳ Esperando que el PDF cargue completamente...');
                                await pdfPage.waitForTimeout(10000);
                        
                                console.log('📸 Tomando captura del PDF...');
                                SCREENSHOT_PATH = `screenshots/captura_edTrabajo_${indexGlobal}.png`;
                                await pdfPage.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
                        
                                console.log(`📸 Captura guardada en: ${SCREENSHOT_PATH}`);
                        
                                console.log('📤 Enviando imagen a Gemini...');
                                resultado = await verificarIdiomas(SCREENSHOT_PATH, lenguaje);
                                console.log('🔍 Respuesta de Gemini:', resultado);

                                if (resultado.includes("Sí coinciden")) {
                                    // Si el PDF está disponible, intenta descargarlo
                                    if (pdfDisponible) {
                                        const nombreLimpio = `${indexGlobal}_${lenguaje}`.replace(/[^\w\-]/g, '_');
                                        const nombreArchivo = `${nombreLimpio}.pdf`;
        
                                        try {
                                            const rutaFinal = await descargarPDF(pdfURL, nombreArchivo, carpetaDestino);
                                            console.log(`📥 PDF guardado en: ${rutaFinal}`);
                                        } catch (err) {
                                            console.log(`❌ Error al descargar el PDF: ${err.message}`);
                                        }
                                    } else {
                                        console.log('⚠️ PDF no descargado porque no está disponible.');
                                    }
                                } else {
                                    noVerificados ++;
                                    console.log(`📄 No verificados: ${noVerificados}`);
                                
                                    // Guardar para generar el PDF más adelante
                                    idiomaNoVerificada.push({
                                        lenguaje: lenguaje.trim(),
                                        resultado: resultado.trim(),
                                        imagenPath: SCREENSHOT_MODAL_PATH,
                                        imagenGemini: SCREENSHOT_PATH,
                                        horaCaptura: horaCaptura.trim()
                                    });
                                }   
                            }
                        } catch (error) {
                            if (error.message.includes('net::ERR_HTTP_RESPONSE_CODE_FAILURE')) {
                                console.log('📭 Documento no subido (error de respuesta HTTP)');
                            } else {
                                console.log('❌ Error al abrir el PDF:', error.message);
                            }
                        
                            if (!nativa) {
                                noVerificados++;
                                idiomaNoVerificada.push({
                                    lenguaje: lenguaje.trim(),
                                    resultado: 'No se ha encontrado ningún documento.',
                                    imagenPath: SCREENSHOT_MODAL_PATH,
                                    imagenGemini: '',
                                    horaCaptura: horaCaptura.trim()
                                });
                            }
                        
                            pdfDisponible = false;
                        } finally {
                            if (pdfPage) {
                                console.log('🛑 Cerrando pestaña del PDF...');
                                await pdfPage.close();
                            }
                        }                        

                        console.log('🛑 Intentando cerrar modal...');

                        async function cerrarModal() {
                        for (let i = 0; i < 3; i++) { // Intentamos hasta 3 veces máximo
                            const botonCerrar = page.getByRole('button', { name: 'Aceptar' });
                            const existeBotonCerrar = await botonCerrar.isVisible().catch(() => false);

                            if (existeBotonCerrar) {
                                console.log(`🔁 Modal todavía visible. Intento ${i + 1} de 3...`);
                                await botonCerrar.click();
                                await page.waitForTimeout(500); // Espera un poco después de hacer click
                            } else {
                                console.log('✅ Modal cerrada exitosamente.');
                                return;
                            }
                        }
                        
                        console.log('❌ No se pudo cerrar la modal después de varios intentos.');
                        }

                        await cerrarModal();
                        

       
                    }
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            await page.getByRole('link', { name: 'Gerencia Pública' }).click();
            
            // Logros y manejo de recursos
            await page.waitForTimeout(5000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_logros_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'LOGROS Y MANEJO DE RECURSOS',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Publicaciones
            await page.getByRole('link', { name: 'Publicaciones' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_publicaciones_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'PUBLICACIONES',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Evaluaciones de desempeño
            await page.getByRole('link', { name: 'Evaluaciones de Desempeño' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_evaluaciones_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'EVALUACIONES DE DESEMPEÑO',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Premios y reconocimientos
            await page.getByRole('link', { name: 'Premios y reconocimientos' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_premios_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'PREMIOS Y RECONOCIMIENTOS',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Particiácion en proyectos
            await page.getByRole('link', { name: 'Participación en proyectos' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_participacionProyectos_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
                    capturasTablas.push({
                        tabla: 'PARTICIPACIÓN EN PROYECTOS',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }

            // Participacion en corporaciones y entidades
            await page.getByRole('link', { name: 'Participación en corporaciones y entidades' }).click();
            await page.waitForTimeout(2000);
            try {
                let indexPagina = 0;

                while (true) {
                    indexPagina ++;
                    await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion').scrollIntoViewIfNeeded();
                    const SCREENSHOT_TABLE_PATH = `screenshots/tabla_oarticipacionCorporaciones_${indexPagina}.png`;
                    await page.screenshot({ path: SCREENSHOT_TABLE_PATH});
                    const horaTabla = `${new Date().toLocaleDateString()} a las ${`${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`}`;
                    capturasTablas.push({
                        tabla: 'PARTICIPACIÓN EN CORPORACIONES Y ENTIDADES',
                        imagen: SCREENSHOT_TABLE_PATH,
                        horaTabla: horaTabla.trim(),
                        pagina: indexPagina.toString()
                    });
            
                    console.log('📌 Verificando si hay más páginas...');
                    const siguienteBtn = page.getByRole('link', { name: 'Next Page' });
            
                    if (await siguienteBtn.isVisible()) {
                        console.log('➡️ Avanzando a la siguiente página...');
                        const classAttr = await siguienteBtn.getAttribute('class');
                        const isDisabled = classAttr && classAttr.includes('ui-state-disabled');
            
                        if (!isDisabled) {
                            await siguienteBtn.click();
                            await page.waitForTimeout(3000);
                        } else {
                            console.log('✅ No hay más páginas (botón deshabilitado).');
                            break;
                        }
                    } else {
                        console.log('✅ No hay más páginas (botón no visible).');
                        break;
                    }
                }        
                
            } catch (error) {
                console.log(`❌ Error en el try: ${error.message}`);
                console.log(`📌 Stack trace: ${error.stack}`);
            }
            


            //Descargar hoja de vida
            let page1, page2;

            try {
                const page1Promise = page.waitForEvent('popup');
                await page.getByRole('link', { name: 'Descargar Mi Hoja De Vida' }).click();
                page1 = await page1Promise;

                await page1.locator('td').filter({ hasText: 'Hoja de Vida Completa' }).locator('span').click();
                await page1.locator('[id="frmPrincipal\\:j_idt139"] span').click();

                const page2Promise = page1.waitForEvent('popup');
                const downloadPromise = page1.waitForEvent('download');

                await page1.waitForTimeout(2000);
                await page1.getByRole('button', { name: 'Descargar' }).click();

                page2 = await page2Promise;
                const download = await downloadPromise;

                // Guardar el archivo
                const fs = require('fs');
                const path = require('path');
                let carpetaDestino = '';
                let nombreArchivo = '';

                if (datosPersona) {
                    const { id, nombre } = datosPersona;
                    const nombreLimpio = nombre.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
                    carpetaDestino = path.join(__dirname, '../Anexos', `${id}_${nombreLimpio}`);
                    nombreArchivo = `hoja_de_vida_${id}.pdf`;

                    if (!fs.existsSync(carpetaDestino)) {
                    fs.mkdirSync(carpetaDestino, { recursive: true });
                    }
                    console.log('📁 Carpeta de destino definida en:', carpetaDestino);
                } else {
                    console.log('⚠️ No se pudo definir la carpeta de destino porque datosPersona es null.');
                }

                const rutaFinal = path.join(carpetaDestino, nombreArchivo);
                await download.saveAs(rutaFinal);

                console.log('📥 Hoja de vida descargada en:', rutaFinal);

                // Cerrar ambas pestañas emergentes
                await page2.close();
                await page1.close();
            } catch (error) {
                console.error('❌ Ocurrió un error al descargar la hoja de vida:', error);

                // Intentar cerrar las páginas si se abrieron
                if (page2 && !page2.isClosed()) {
                    await page2.close().catch(() => {}); // por si falla el cierre
                }
                if (page1 && !page1.isClosed()) {
                    await page1.close().catch(() => {});
                }
            }

            estadoHV = noVerificados > 0 ? 'Incompleta' : 'Completa';
            await generarReportePDF( estadoHV, capturasTablas, datosPersona, soportesNoVerificados, educacionNoVerificada, expLaboralNoVerificada, expDocenteNoVerificada, documentosAdicionalesNoVerificada, educacionTrabajoNoVerificada, idiomaNoVerificada );  
              



            await page.evaluate(() => window.scrollTo(0, 0));
            await page.getByRole('link', { name: 'Información Personal' }).click();
            await page.getByRole('link', { name: 'Información Personal' }).click();
            await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();

            await page.waitForTimeout(5000);

            
            datosExcel.push([id, tipoDoc, nombreCompleto, estadoHV, fechaNac, edad, generoFormato, correo, correoOficina, telefonoCompletoResidencia, celular, telefonoCompletoOficina, direccion, tipoZona, municipio, departamento, pais]);

            console.log(datosExcel);
        }
        catch (error) {
        console.error('❌ Error durante la validación:', error);
        return;

    }

    // Crear y guardar el archivo Excel
    generarReporte(datosExcel, rutaArchivo);
});