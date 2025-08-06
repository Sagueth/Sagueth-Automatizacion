
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const sesionPath = 'sesion.json';

// Utilidad para fecha actual
function obtenerFechaActual() {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    const hh = String(hoy.getHours()).padStart(2, '0');
    const min = String(hoy.getMinutes()).padStart(2, '0');
    const ss = String(hoy.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}_${hh}-${min}-${ss}`;
}

// Usa sesión previa si existe
test.use({ storageState: fs.existsSync(sesionPath) ? sesionPath : undefined });

test('Generar JSON con documento único @integration', async ({ page, context }) => {
    test.setTimeout(0);

    // ✅ Recibe DOCUMENTO desde env
    const documento = process.env.DOCUMENTO;
    if (!documento) {
        console.log('❌ No se proporcionó DOCUMENTO');
        test.skip();
        return;
    }
    console.log(`📄 Documento recibido: ${documento}`);

    let jsonAGenerar = [];

    // Ir a la página principal
    await page.goto('https://www.funcionpublica.gov.co/sigep-web/sigep2/index.xhtml');

    let sesionActiva = true;

    // Verifica sesión
    try {
        await page.waitForSelector('text=Información Personal', { timeout: 5000 });
        console.log('✅ Sesión activa');
    } catch {
        console.log('🔴 Iniciando nueva sesión');
        sesionActiva = false;
    }

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
    }// Acceder a "Información Personal"
    await page.getByRole('link', { name: 'Información Personal' }).click();
    await page.getByRole('link', { name: 'Información Personal' }).click();
    await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();

    console.log(`📄 Buscando documento: ${documento}`);

    try {
        const educacionFormal = [];
        const experienciaLaboral = [];
        const experienciaDocente = [];

        const documentosAdicionales = [];
        const educacionTrabajo = [];
        const educacionIdiomas = [];
        const logrosYManejoDeRecursos = [];
        const publicaciones = [];
        const evaluacionesDeDesempenno = [];
        const premiosYReconocimientos = [];
        const participacionEnProyectos = [];
        const participacionEnCorporaciones = [];

        let noVerificados = 0;
        let [, nombreCompleto, tipoDoc, id, fechaNac, correo, genero] = '';
        let edad = '';
        let fechaFormateada = '';
        let generoFormato = '';
        let datosPersona = null;

        console.log(`📄 No verificados: ${noVerificados}`);
        console.log(`📄 Buscando documento: ${documento}`);
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
            throw new Error('No se encontró el botón "Ver Detalle"');
        }

        try {
            const datos = await page.locator('text=Datos Básicos de Identificación').locator('xpath=..').first().innerText();
            console.log(datos);

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

                if (!datos) {
  console.log('⚠️ Datos no encontrados');
  return; // ✔️ Termina el test
}

            }

            const match = datos.match(/Datos Básicos de Identificación\n\n\nCambiar \/ Subir foto\n(.+)\n\n\n\n\nTipo de Documento:\s*(.+)\nNúmero de Identificación:\s*(\d+)\nFecha de Nacimiento:\s*([\d]+ de [a-z]+ del \d+)\nCorreo Electrónico Personal \(Principal\):\s*([^\n]+)\nGénero:\s*(\w+)/i);

            if (match) {

                [, nombreCompleto, tipoDoc, id, fechaNac, correo, genero] = match;
                edad = calcularEdad(fechaNac);
                generoFormato = genero.includes('Masculino') ? 'M' : 'F';
                fechaFormateada = formatearFecha(fechaNac);

                datosPersona = {
                    nombre: nombreCompleto,
                    tipoDoc,
                    id,
                    fechaFormateada,
                    edad,
                    genero: generoFormato,
                    correo
                };
            }

            intentoExitoso = true; // Solo marcamos como exitoso si llegamos aquí sin reiniciar

        } catch (error) {
            console.log(`❌ Error obteniendo datos: ${error}`);
        }

        const claseLibreta = await page.getByLabel('Clase Libreta Militar:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
        const numeroLibreta = await page.getByRole('textbox', { name: 'Número Libreta Militar:' }).inputValue();
        const distritoMilitar = await page.getByRole('textbox', { name: 'Distrito Militar:' }).inputValue();

        await page.getByRole('link', { name: 'Datos de Contacto' }).click();

        // Obtener valores usando el label o role, como indica codegen
        const pais = await page.getByLabel('País de Residencia :').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
        const departamento = await page.getByLabel('Departamento:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
        const municipio = await page.getByLabel('Municipio:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
        const tipoZona = await page.getByLabel('Tipo de Zona:').evaluate((select: HTMLSelectElement) => select.selectedOptions[0]?.textContent?.trim());
        const direccion = await page.getByRole('textbox', { name: 'Ingrese Dirección' }).inputValue();
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

        await page.getByRole('link', { name: 'Educación' }).click();

        // Educacion formal
        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Educación Formal...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableEducacionFormal"] div').filter({ hasText: 'InstituciónTítuloPaísFecha' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableEducacionFormal tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableEducacionFormal').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableEducacionFormal tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableEducacionFormal tbody tr`).nth(i);

                    const institucion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Institución/i, '').trim();
                    const titulo = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Título/i, '').trim();
                    const pais = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/País/i, '').trim();
                    const fechaFin = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Fecha Terminación Materias/i, '').trim();
                    const fechaGrados = (await filaActual.locator('td:nth-child(5)').textContent())?.replace(/^Fecha de Grado/i, '').trim();

                    console.log(`🏫 Institución: ${institucion}`);
                    console.log(`🎓 Título: ${titulo}`);
                    console.log(`🎓 País: ${pais}`);
                    console.log(`📄 Fecha Terminación Materias: ${fechaFin}`);
                    console.log(`📅 Fecha de Grado: ${fechaGrados}`);

                    educacionFormal.push({
                        institucion: institucion.trim(),
                        titulo: titulo.trim(),
                        pais: pais.trim(),
                        fechaFin: fechaFin.trim(),
                        fechaGrados: fechaGrados.trim()
                    });
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

        // Educacion para el trabajo y el desarrollo humano
        await page.getByRole('link', { name: 'Educación para el Trabajo y' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Educación para el trabajo...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano"] div').filter({ hasText: 'InstituciónCursoModalidad' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableDesarrolloHumano tbody tr`).nth(i);

                    const institucion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Institución/i, '').trim();
                    const curso = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Curso/i, '').trim();
                    const modalidad = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/Modalidad/i, '').trim();
                    const capacitacion = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Medio de Capacitación/i, '').trim();
                    const fechaFin = (await filaActual.locator('td:nth-child(5)').textContent())?.replace(/^Fecha de Terminación/i, '').trim();

                    console.log(`🏫 Institución: ${institucion}`);
                    console.log(`🎓 Curso: ${curso}`);
                    console.log(`🎓 Modalidad: ${modalidad}`);
                    console.log(`📄 Medio de Capacitación: ${capacitacion}`);
                    console.log(`📅 Fecha de Terminación: ${fechaFin}`);

                    educacionTrabajo.push({
                        institucion: institucion.trim(),
                        curso: curso.trim(),
                        modalidad: modalidad.trim(),
                        capacitacion: capacitacion.trim(),
                        fechaFin: fechaFin.trim()
                    });
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
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Idiomas...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas"] div').filter({ hasText: 'LenguajeConversaciónLecturaRedacción' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:groupView\\:dataTableIdiomas tbody tr`).nth(i);

                    const lenguaje = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Lenguaje/i, '').trim();
                    const conversacion = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Conversación/i, '').trim();
                    const lectura = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/Lectura/i, '').trim();
                    const redaccion = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Redacción/i, '').trim();
                    let checkbox = (await filaActual.locator('td:nth-child(5) input[type="checkbox"]'));
                    let nativa = await checkbox.isChecked();

                    console.log(`🏫 Lenguaje: ${lenguaje}`);
                    console.log(`🎓 Conversación: ${conversacion}`);
                    console.log(`🎓 Lectura: ${lectura}`);
                    console.log(`📄 Redacción: ${redaccion}`);
                    console.log(`📅 Nativa: ${nativa}`);

                    educacionIdiomas.push({
                        lenguaje: lenguaje.trim(),
                        conversacion: conversacion.trim(),
                        lectura: lectura.trim(),
                        redaccion: redaccion.trim(),
                        nativa: nativa
                    });
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



        // Experiencia Laboral
        await page.getByRole('link', { name: 'Experiencia Laboral', exact: true }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Experiencia Laboral...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:dataTableExperienciaProfesional"] div').filter({ hasText: 'Tipo de EntidadNombre de la EntidadDependencia o ÁreaCargo' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableExperienciaProfesional tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableExperienciaProfesional').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableExperienciaProfesional tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:dataTableExperienciaProfesional tbody tr`).nth(i);

                    const tipo = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Tipo de Entidad/i, '').trim();
                    const nombre = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Nombre de Entidad/i, '').trim();
                    const dependencia = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/Dependencia o Área/i, '').trim();
                    const cargo = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^Cargo/i, '').trim();
                    const fechaIngreso = (await filaActual.locator('td:nth-child(5)').textContent())?.replace(/^Fecha Ingreso/i, '').trim();
                    const fechaFin = (await filaActual.locator('td:nth-child(6)').textContent())?.replace(/^Fecha de Terminación/i, '').trim();

                    console.log(`🏫 Tipo de Entidad: ${tipo}`);
                    console.log(`🎓 Nombre de Entidad: ${nombre}`);
                    console.log(`🎓 Dependencia o Área: ${dependencia}`);
                    console.log(`📄 Cargo: ${cargo}`);
                    console.log(`📅 Fecha Ingreso: ${fechaIngreso}`);
                    console.log(`📅 Fecha de Terminación: ${fechaFin}`);

                    experienciaLaboral.push({
                        tipo: tipo.trim(),
                        nombre: nombre.trim(),
                        dependencia: dependencia.trim(),
                        cargo: cargo.trim(),
                        fechaIngreso: fechaIngreso.trim(),
                        fechaFin: fechaFin.trim()
                    });
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


        // Experiencia laboral docente
        await page.getByRole('link', { name: 'Experiencia Laboral Docente' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Experiencia Laboral Docente...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:dataTabExpDocente"] div').filter({ hasText: 'Institución EducativaNivel AcadémicoÁrea de ConocimientoPaís' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTabExpDocente tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTabExpDocente').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTabExpDocente tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:dataTabExpDocente tbody tr`).nth(i);

                    const institucion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Institución Educativa/i, '').trim();
                    const nivel = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Nivel Académico/i, '').trim();
                    const area = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/Área de Conocimiento/i, '').trim();
                    const pais = (await filaActual.locator('td:nth-child(4)').textContent())?.replace(/^País/i, '').trim();
                    const fechaIngreso = (await filaActual.locator('td:nth-child(5)').textContent())?.replace(/^Fecha Ingreso/i, '').trim();
                    const fechaFin = (await filaActual.locator('td:nth-child(6)').textContent())?.replace(/^Fecha de Terminación/i, '').trim();

                    console.log(`🏫 Institución Educativa: ${institucion}`);
                    console.log(`🎓 Nivel Académico: ${nivel}`);
                    console.log(`🎓 Área de Conocimiento: ${area}`);
                    console.log(`📄 País: ${pais}`);
                    console.log(`📅 Fecha Ingreso: ${fechaIngreso}`);
                    console.log(`📅 Fecha de Terminación: ${fechaFin}`);

                    experienciaDocente.push({
                        institucion: institucion.trim(),
                        nivel: nivel.trim(),
                        area: area.trim(),
                        pais: pais.trim(),
                        fechaIngreso: fechaIngreso.trim(),
                        fechaFin: fechaFin.trim()
                    });
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


        // Documentos Adicionales
        await page.getByRole('link', { name: 'Documentos Adicionales' }).click();
        await page.waitForTimeout(2000);
        await page.waitForSelector('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr');

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Experiencia Laboral Docente...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales"] div').filter({ hasText: 'Tipo DocumentoDescripción' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:dataTableDocumentosAdicionales tbody tr`).nth(i);

                    const tipo = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Tipo Documento/i, '').trim();
                    const descripcion = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Descripción/i, '').trim();

                    console.log(`🏫 Tipo Documento: ${tipo}`);
                    console.log(`🎓 Descripción: ${descripcion}`);
                    documentosAdicionales.push({
                        tipo: tipo.trim(),
                        descripcion: descripcion.trim()
                    });
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
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Logros y manejo de recursos...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos"] div').filter({ hasText: 'Nombre entidadEmpleados OrganizaciónEmpleados a Cargo' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblLogrosYRecursos tbody tr`).nth(i);

                    const nombreEntidad = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Nombre entidad/i, '').trim();
                    const empleadosOrganizacion = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Empleados Organización/i, '').trim();
                    const empleadosACargo = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/Empleados a Cargo/i, '').trim();

                    console.log(`🏫 Nombre entidad: ${nombreEntidad}`);
                    console.log(`🎓 Empleados Organización: ${empleadosOrganizacion}`);
                    console.log(`🎓 Empleados a Cargo: ${empleadosACargo}`);

                    logrosYManejoDeRecursos.push({
                        nombreEntidad: nombreEntidad.trim(),
                        empleadosOrganizacion: empleadosOrganizacion.trim(),
                        empleadosACargo: empleadosACargo.trim()
                    });
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


        // Publicaciones
        await page.getByRole('link', { name: 'Publicaciones' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Publicaciones...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones"] div').filter({ hasText: 'Tipo de PublicaciónNombre de la Publicación' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPublicaciones tbody tr`).nth(i);

                    const tipoPublicacion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Tipo de Publicación/i, '').trim();
                    const nombrePublicacion = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Nombre de Publicación/i, '').trim();

                    console.log(`🏫 Tipo de Publicación: ${tipoPublicacion}`);
                    console.log(`🎓 Nombre de Publicación: ${nombrePublicacion}`);

                    publicaciones.push({
                        tipoPublicacion: tipoPublicacion.trim(),
                        nombrePublicacion: nombrePublicacion.trim()
                    });
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


        // Evaluaciones de desempeño
        await page.getByRole('link', { name: 'Evaluaciones de Desempeño' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Evaluaciones de desempeño...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno"] div').filter({ hasText: 'Nombre entidadEscala de CalificaciónCalificación Obtenida' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblEvsDesempenno tbody tr`).nth(i);

                    const nombreEntidad = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Nombre entidad/i, '').trim();
                    const escalaCalificacion = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Escala de Calificación/i, '').trim();
                    const calificacionObtenida = (await filaActual.locator('td:nth-child(3)').textContent())?.replace(/^Calificación Obtenida/i, '').trim();

                    console.log(`🏫 Nombre entidad: ${nombreEntidad}`);
                    console.log(`🏫 Escala de Calificación: ${escalaCalificacion}`);
                    console.log(`🎓 Calificación Obtenida: ${calificacionObtenida}`);

                    evaluacionesDeDesempenno.push({
                        nombreEntidad: nombreEntidad.trim(),
                        escalaCalificacion: escalaCalificacion.trim(),
                        calificacionObtenida: calificacionObtenida.trim()
                    });
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


        // Premios y reconocimientos
        await page.getByRole('link', { name: 'Premios y reconocimientos' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Premios y reconocimientos...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos"] div').filter({ hasText: 'Nombre de la Entidad / OrganizaciónPaís' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblPremiosReconocimientos tbody tr`).nth(i);

                    const nombreEntidad = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Nombre de la Entidad \/ Organización/i, '').trim();
                    const pais = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^País/i, '').trim();

                    console.log(`🏫 Nombre de la Entidad / Organización: ${nombreEntidad}`);
                    console.log(`🎓 País: ${pais}`);

                    premiosYReconocimientos.push({
                        nombreEntidad: nombreEntidad.trim(),
                        pais: pais.trim()
                    });
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


        // Particiácion en proyectos
        await page.getByRole('link', { name: 'Participación en proyectos' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Particiácion en proyectos...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos"] div').filter({ hasText: 'Nombre entidadNombre del Proyecto' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionProyectos tbody tr`).nth(i);

                    const nombreEntidad = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Nombre entidad/i, '').trim();
                    const nombreProyecto = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Nombre del Proyecto/i, '').trim();

                    console.log(`🏫 Nombre entidad: ${nombreEntidad}`);
                    console.log(`🎓 Nombre del Proyecto: ${nombreProyecto}`);

                    participacionEnProyectos.push({
                        nombreEntidad: nombreEntidad.trim(),
                        nombreProyecto: nombreProyecto.trim()
                    });
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


        // Participacion en corporaciones y entidades
        await page.getByRole('link', { name: 'Participación en corporaciones y entidades' }).click();
        await page.waitForTimeout(2000);

        try {
            let indexGlobal = 0;
            let indexPagina = 0;

            while (true) {
                indexPagina++;
                console.log('📌 Obteniendo filas de la tabla Participacion en corporaciones y entidades...');
                await page.locator('[id="frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion"] div').filter({ hasText: 'Nombre CorporaciónnNombre entidad' }).click();
                const filas = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion tbody tr').count();
                await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion').scrollIntoViewIfNeeded();

                if (filas === 0) {
                    console.log('❌ No hay más filas en la tabla.');
                    noVerificados++;
                    break;
                }

                // ⚠️ Verificar si la única fila contiene el texto de "sin registros"
                if (filas === 1) {
                    const textoFila = await page.locator('#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion tbody tr td').first().textContent();
                    console.log(textoFila);
                    if (textoFila?.toLowerCase().includes('no se tienen registros para mostrar')) {
                        console.log('❌ La tabla no tiene registros reales (mensaje de "No se tienen registros para mostrar").');
                        noVerificados++;
                        break;
                    }
                }

                for (let i = 0; i < filas; i++, indexGlobal++) {
                    console.log(`📌 Procesando fila ${indexGlobal + 1}...`);
                    const filaActual = page.locator(`#frmPrincipal\\:tabHojaDeVida\\:tabViewGerenciaPublica\\:tblParticipacionCorporacion tbody tr`).nth(i);

                    const nombreCorporacion = (await filaActual.locator('td:nth-child(1)').textContent())?.replace(/^Nombre Corporaciónn/i, '').trim();
                    const nombreEntidad = (await filaActual.locator('td:nth-child(2)').textContent())?.replace(/^Nombre entidad/i, '').trim();

                    console.log(`🎓 Nombre Corporación: ${nombreCorporacion}`);
                    console.log(`🏫 Nombre entidad: ${nombreEntidad}`);

                    participacionEnCorporaciones.push({
                        nombreCorporacion: nombreCorporacion.trim(),
                        nombreEntidad: nombreEntidad.trim()
                    });
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



        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByRole('link', { name: 'Información Personal' }).click();
        await page.getByRole('link', { name: 'Información Personal' }).click();
        await page.getByRole('link', { name: 'Gestionar Hoja de Vida' }).click();

        await page.waitForTimeout(5000);


        jsonAGenerar.push({
            id: id,
            tipoDocumento: tipoDoc,
            nombreCompleto: nombreCompleto,
            fechaNacimiento: fechaFormateada,
            edad: edad,
            genero: generoFormato,
            correoPersonal: correo,
            correoOficina: correoOficina,
            telefonoResidencia: telefonoCompletoResidencia,
            celular: celular,
            telefonoOficina: telefonoCompletoOficina,
            direccion: direccion,
            tipoZona: tipoZona,
            municipio: municipio,
            departamento: departamento,
            pais: pais,
            claseLibreta: claseLibreta,
            numeroLibreta: numeroLibreta,
            distritoMilitar: distritoMilitar,
            educacionFormal: educacionFormal,
            educacionTrabajo: educacionTrabajo,
            educacionIdiomas: educacionIdiomas,
            experienciaLaboral: experienciaLaboral,
            experienciaDocente: experienciaDocente,
            documentosAdicionales: documentosAdicionales,
            logrosYManejoDeRecursos: logrosYManejoDeRecursos,
            publicaciones: publicaciones,
            evaluacionesDeDesempenno: evaluacionesDeDesempenno,
            premiosYReconocimientos: premiosYReconocimientos,
            participacionEnProyectos: participacionEnProyectos,
            participacionEnCorporaciones: participacionEnCorporaciones
        });

        // console.log(datosExcel);
        console.log(jsonAGenerar);
        console.log('✅ Extracción completada');
    } catch (error) {
        console.error('❌ Error durante la extracción:', error);
        return;
    }




    // Generar json
    fs.writeFileSync('datos_exportados.json', JSON.stringify(jsonAGenerar, null, 2), 'utf8');
    console.log('✅ Archivo exportado correctamente como datos_exportados.json');
});