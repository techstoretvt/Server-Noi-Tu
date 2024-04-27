import db from '../models'

import decodeToken from '../services/commont'
require('dotenv').config()

const checkAdmin = async (req, res, next) => {
    try {
        //check admin 1 or 2
        let accessToken = req.body.accessToken;
        if (!accessToken) {
            return res.status(200).json({
                errCode: 1,
                errMessage: 'Chưa đăng nhập!'
            })
        }

        let decoded = decodeToken(accessToken, process.env.ACCESS_TOKEN_SECRET)
        if (decoded === null) {
            return res.status(200).json({
                errCode: 1,
                errMessage: 'Chưa đăng nhập!'
            })
        }

        next();
    }
    catch (e) {
        console.log('Get all code error: ', e);
        return res.status(200).json({
            errCode: -1,
            errMessage: 'Error from server'
        })
    }
}

const checkAdminRoot = async (req, res, next) => {
    try {
        //check admin 1
        let accessToken = req.body.accessToken;
        if (!accessToken) {
            return res.status(200).json({
                errCode: 1,
                errMessage: 'Chưa đăng nhập!'
            })
        }

        let decoded = decodeToken(accessToken, process.env.ACCESS_TOKEN_SECRET)
        if (decoded === null) {
            return res.status(200).json({
                errCode: 1,
                errMessage: 'Chưa đăng nhập!'
            })
        }

        if (decoded.idTypeUser !== 1) {
            return res.status(200).json({
                errCode: 2,
                errMessage: 'Không được phép truy cập!'
            })
        }

        next();
    }
    catch (e) {
        console.log('Get all code error: ', e);
        return res.status(200).json({
            errCode: -1,
            errMessage: 'Error from server'
        })
    }
}

module.exports = {
    checkAdmin,
    checkAdminRoot
}