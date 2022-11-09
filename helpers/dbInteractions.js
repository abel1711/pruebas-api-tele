const fs = require('fs');

const archivo = `./db/dataBase.json`;
const archivoMensajes = `./db/mensajes.json`;


const cargarDataBase = (data) => {
    fs.writeFileSync(archivo, JSON.stringify(data));
};

const leerDataBase = () => {


    if (!fs.existsSync(archivo)) return null;

    const info = fs.readFileSync(archivo, { encoding: 'utf-8' });
    return JSON.parse(info);


}
const leerDataBaseMensajes = () => {


    if (!fs.existsSync(archivoMensajes)) return null;

    const info = fs.readFileSync(archivoMensajes, { encoding: 'utf-8' });
    return JSON.parse(info);


}
const cargarDataBaseMensajes = (data) => {
    
    fs.writeFileSync(archivoMensajes, JSON.stringify(data));

};

module.exports = {
    cargarDataBase,
    leerDataBase,
    leerDataBaseMensajes,
    cargarDataBaseMensajes
}