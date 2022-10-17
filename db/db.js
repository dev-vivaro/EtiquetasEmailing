const dbconfig = require('./config.json')
const sql = require('mssql')
const fs = require('fs')
let connProd
let connQA
let connDev

async function getConnProd() {
  if (connProd) {
    log('ya existe conexion Prod')
    return connProd
  }
  log('crea nueva conexion Prod')
  connProd = new sql.ConnectionPool(dbconfig.prod)
  await connProd.connect()
  return connProd
}

async function getConnQA() {
  if (connQA) {
    log('ya existe conexion QA')
    return connQA
  }
  log('crea nueva conexion QA')
  connQA = new sql.ConnectionPool(dbconfig.qa)
  await connQA.connect()
  return connQA
}

async function getConnDev() {
  if (connDev) {
    log('ya existe conexion Dev')
    return connDev
  }
  log('crea nueva conexion Dev')
  connDev = new sql.ConnectionPool(dbconfig.dev)
  await connDev.connect()
  return connDev
}


function log(info) {
	let hr = getDateTime()
	let archivoLog = getDate()
	fs.appendFileSync(`./logs/logdb.${archivoLog}`, `${hr} | ${info}\r\n`)
	return
}
const getDateTime = () => {
	let today = new Date()
	let dd = today.getDate()
	let mm = today.getMonth() + 1
	const yyyy = today.getFullYear()
	let hr = today.getHours()
	let min = today.getMinutes()
	let seg = today.getSeconds()
	if (dd < 10) {
		dd = `0${dd}`
	}
	if (mm < 10) {
		mm = `0${mm}`
	}
	if (hr < 10) {
		hr = `0${hr}`
	}
	if (min < 10) {
		min = `0${min}`
	}
	if (seg < 10) {
		seg = `0${seg}`
	}
	today = `${dd}${mm}${yyyy}-${hr}${min}${seg}`
	return today
}
const getDate = () => {
	let today = new Date()
	let dd = today.getDate()

	let mm = today.getMonth() + 1
	const yyyy = today.getFullYear()
	if (dd < 10) {
		dd = `0${dd}`
	}

	if (mm < 10) {
		mm = `0${mm}`
	}
	today = `${dd}-${mm}-${yyyy}`
	return today
}

module.exports = {
  getConnProd,
	getConnQA,
	getConnDev
}
