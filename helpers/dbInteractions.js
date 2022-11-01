const fs = require('fs');

const archivo= `./db/dataBase.json`;


const cargarDataBase = ( data )=>{
    fs.writeFileSync(archivo, JSON.stringify(data));
};

const leerDataBase = ()=>{

    
    if(!fs.existsSync(archivo)) return null;

    const info = fs.readFileSync( archivo, { encoding: 'utf-8'});
    return JSON.parse(info);

    
}

module.exports={
    cargarDataBase,
    leerDataBase
}