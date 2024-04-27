import JWT from 'jsonwebtoken';
import db from '../models';
import { v4 as uuidv4 } from 'uuid';
const createError = require('http-errors');

const signAccessToken = async (user_Id) => {
    return new Promise((resolve, reject) => {
        const payload = {
            id: user_Id,
        };
        const secret = process.env.ACCESS_TOKEN_SECRET;
        const options = {
            expiresIn: '2 days',
        };

        JWT.sign(payload, secret, options, (err, token) => {
            if (err) reject(err);
            resolve(token);
        });
    });
};

const signRefreshToken = async (user_Id, device_id) => {
    return new Promise((resolve, reject) => {
        try {
            const payload = {
                id: user_Id,
            };
            const secret = process.env.REFESH_TOKEN_SECRET;
            const options = {
                expiresIn: '1y',
            };

            JWT.sign(payload, secret, options, async (err, token) => {
                if (err) return reject(err);

                let user_refresh_token = await db.userRefreshTokens.findOne({
                    where: {
                        idUser: user_Id,
                        device_id: device_id || 'test',
                    },
                    raw: false,
                });
                if (!user_refresh_token) {
                    await db.userRefreshTokens.create({
                        id: uuidv4(),
                        idUser: user_Id,
                        device_id: device_id || 'test',
                        refreshToken: token,
                    });
                } else {
                    user_refresh_token.refreshToken = token;
                    await user_refresh_token.save();
                }

                resolve(token);
            });
        } catch (error) {
            reject(error);
        }
    });
};

const verifyAccessToken = (req, res, next) => {
    // console.log(req.headers);
    if (!req.headers['authorization']) {
        console.log("unauthorize");
        return next(createError.Unauthorized());
    }

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader.split(' ');
    const token = bearerToken[1];

    JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if (err) {
            if (err.name === 'JsonWebTokenError') {
                return next(createError.Unauthorized(err.message));
            }
            return next(createError.Unauthorized(err.message));
        }

        req.payload = payload;
        next();
    });
};

const verifyAccessTokenAdmin = (req, res, next) => {
    // console.log('req.cookies.accessToken: ', req.cookies.accessToken);
    if (!req.headers['authorization']) {
        return next(createError.Unauthorized());
    }

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader.split(' ');
    const token = bearerToken[1];

    JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        if (err) {
            if (err.name === 'JsonWebTokenError') {
                return next(createError.Unauthorized(err.message));
            }
            return next(createError.Unauthorized(err.message));
        }

        let user = await db.User.findOne({
            where: {
                id: payload.id,
            },
        });
        if (!user || user.idTypeUser === '3')
            return next(createError.Unauthorized('Not admin'));

        req.payload = payload;
        next();
    });
};

const verifyRefreshToken = async (refreshToken, device_id = 'test') => {
    return new Promise((resolve, reject) => {
        JWT.verify(
            refreshToken,
            process.env.REFESH_TOKEN_SECRET,
            async (err, payload) => {
                if (err) {
                    return reject(err);
                }

                const check = await db.userRefreshTokens.findOne({
                    where: {
                        idUser: payload.id,
                        refreshToken,
                        device_id,
                    },
                });

                if (!check)
                    return reject(
                        createError.Unauthorized('Khoông coó trong db')
                    );

                return resolve(payload);
            }
        );
    });
};

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    verifyAccessTokenAdmin,
};
