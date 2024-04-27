const fs = require('fs').promises;
const path = require('path');
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const filename = path.join(__dirname, '../Logs', 'logs.log');

const logEvents = async (msg) => {
    const dateTime = `${format(new Date(), 'dd-MM-yyyy HH:mm:ss')}`
    const contentLog = `${dateTime} ${uuidv4()} Message: ${msg}\n`;
    try {
        fs.appendFile(filename, contentLog)
    } catch (error) {
        console.log('Error in file log: ', error);
    }
}

module.exports = logEvents;