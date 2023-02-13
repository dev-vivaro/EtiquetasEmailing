const etiqueta = 1;
const PID = process.pid;
process.title = `PID: ${PID}`;
//console.log(process.title)
const sql = require("mssql");
// const axios = require('axios')
const fs = require("fs");
const nodemailer = require("nodemailer");
const db = require("./db/db");
let pool;
//config etiqueta

const envio = async () => {
  log(`Buscando registros pendientes.`);
  let registros;

  registros = await pool
    .request()
    .input("Etiqueta", sql.Int, etiqueta)
    .execute("usp_GetMsgBoletines"); //SP obtiene registros de etiqueta
  // console.log(registros)

  if (registros.recordset.length > 0) {
    log(`Enviando ${registros.recordset.length} registros.`);
    const promises = registros.recordset.map(async (reg) => {
      if (reg.ColumnaJson) {
        let columnasJson = JSON.parse(reg.ColumnaJson);
        let columnas = Object.keys(columnasJson);
        columnas.map((col) => {
          let regex = new RegExp(`\\$\\$${col}\\$\\$`, "g");
          reg.estructurahtml = reg.estructurahtml.replace(
            regex,
            columnasJson[`${col}`]
          );
        });
      }

      try {
        let config =
          reg.ServiceName == "Custom"
            ? {
                host: reg.HostSMTP,
                port: reg.PuertoSMTP,
                secure: registros.SeguridadActiva == 1 ? true : false,
                auth: {
                  user: reg.UsuarioSMTP,
                  pass: reg.PasswordSMTP,
                },
                tls: {
                  rejectUnauthorized: false,
                },
              }
            : {
                service: reg.ServiceName,
                secure: registros.SeguridadActiva == 1 ? true : false,
                port: 465,
                auth: {
                  user: reg.UsuarioSMTP,
                  pass: reg.PasswordSMTP,
                },
                tls: {
                  rejectUnauthorized: false,
                },
              };
        let remitente = {
          from: `${reg.NombreRemitente} <${reg.EmailRemitente}>`,
        };
        let mensaje = {
          to: reg.Email,
          subject: reg.asunto,
          html: `${reg.estructurahtml}`,
        };
        // console.log(config,remitente,mensaje)
        let resultado = await email(config, remitente, mensaje);
        // console.log('try', resultado)
        log(
          `${reg.IdEnvioEmailing} | ${
            resultado?.reason || JSON.stringify(resultado)
          }`
        );

        let actualizado = await pool
          .request()
          .input("IdUsuario", sql.Int, reg.IdUsuario)
          .input("IdMensaje", sql.Int, reg.IdEnvioEmailing)
          .input("Resultado", sql.Int, resultado.code ? 3 : 1)
          .input("Descripcion", sql.VarChar(200), resultado.response)
          .execute("usp_ActualizaMsgEtiqueta"); //SP actualiza resultado
        log(`Actualizado | ${reg.IdEnvioEmailing} | 1`);

        return 1;
      } catch (err) {
        // console.log('catch', err)
        let actualizado = await pool
          .request()
          .input("IdUsuario", sql.Int, reg.IdUsuario)
          .input("IdMensaje", sql.Int, reg.IdEnvioEmailing)
          .input("Resultado", sql.Int, 3)
          .input("Descripcion", sql.VarChar(200), err.response)
          .execute("usp_ActualizaMsgEtiqueta"); //SP actualiza resultado
        console.log(err);
        log(
          `Actualizado | ${reg.IdEnvioEmailing} | ${JSON.stringify(err) || err}`
        );

        return 0;
      }
    });
    await Promise.allSettled(promises);
    //console.log('se resuelven promesas')
    // log(JSON.stringify(results))
  } else {
    log(
      `No hay registros pendientes | ${JSON.stringify(
        registros.recordset.length
      )}`
    );
  }
  setTimeout(envio, 5000); //espera 5 segundo para ejecutarse nuevamente
};

async function email(config, remitente, mensaje) {
  let transporter = nodemailer.createTransport(config, remitente);
  log(`PETICION | CONFIG | ${JSON.stringify(config)}`);
  log(`PETICION | REMITENTE | ${JSON.stringify(remitente)}`);
  log(`PETICION | MENSAJE | ${JSON.stringify(mensaje)}`);

  try {
    let response = await transporter.sendMail(mensaje);
    // console.log('RESPONSE Email() ', response)
    transporter.close();
    return response;
  } catch (err) {
    // console.log('ERROR Email() ', err)
    return err;
  }
}

const getDate = () => {
  let today = new Date();
  let dd = today.getDate();

  let mm = today.getMonth() + 1;
  const yyyy = today.getFullYear();
  if (dd < 10) {
    dd = `0${dd}`;
  }

  if (mm < 10) {
    mm = `0${mm}`;
  }
  today = `${dd}-${mm}-${yyyy}`;
  return today;
};

function log(info) {
  let hr = new Date();
  let archivoLog = getDate();
  fs.appendFileSync(
    `./logs/EmailingProd${etiqueta}.${archivoLog}`,
    `${hr} | ${info}\r\n`
  );
  return;
}

(async () => {
  pool = await db.getConnProd();
  envio();
  return;
})();
