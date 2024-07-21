import db from "../models";
require("dotenv").config();
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Verifier from "email-verifier";
const { Op, where } = require("sequelize");
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../helpers/JWT_service";

const paypal = require("paypal-rest-sdk");
import commont from "../services/commont";
const { google } = require("googleapis");
// const { OAuth2Client } = require('google-auth-library');
const fs = require("fs");
const path = require("path");
import { handleEmit } from "../index";
import Fuse from "fuse.js";
import { dataflow } from "googleapis/build/src/apis/dataflow";
const createError = require("http-errors");
let contentJson = require('./content-json.json')
const axios = require('axios');
// let allContentJson = require('./all-data.json')
var cloudinary = require("cloudinary");
// await cloudinary.v2.uploader.destroy('vznd4hds4kudr0zbvfop')
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

// import sequelize from 'sequelize';

paypal.configure({
    mode: "sandbox", //sandbox or live
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET,
});
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
    version: "v3",
    auth: oAuth2Client,
});

let GG_Drive = {
    setFilePublic: async (fileId) => {
        try {
            await drive.permissions.create({
                fileId,
                requestBody: {
                    role: "reader",
                    type: "anyone",
                },
            });

            const getUrl = await drive.files.get({
                fileId,
                fields: "webViewLink, webContentLink",
            });

            return getUrl;
        } catch (error) {
            console.error(error);
        }
    },
    uploadFile: async (name, idForder = "") => {
        try {
            let date = new Date().getTime();

            const createFile = await drive.files.create({
                requestBody: {
                    name: `Video-${date}`,
                    mimeType: "video/*",
                    parents: [idForder],
                },
                media: {
                    mimeType: "video/*",
                    body: fs.createReadStream(
                        path.join(__dirname, `../public/videoTam/${name}`)
                    ),
                    // body: `../../../build/public/videoTam/${name}`
                },
            });
            const fileId = createFile.data.id;
            const getUrl = await GG_Drive.setFilePublic(fileId);

            return {
                url: getUrl.data.webViewLink,
                id: createFile.data.id,
            };
        } catch (error) {
            console.error("Loi tu upload", error);
        }
    },
    deleteFile: async (fileId) => {
        try {
            const deleteFile = await drive.files.delete({
                fileId: fileId,
            });
        } catch (error) {
            console.error(error);
        }
    },
};

let verifier_email = new Verifier(process.env.API_KEY_VERIFY_EMAIL, {
    checkCatchAll: false,
    checkDisposable: false,
    checkFree: false,
    validateDNS: false,
    validateSMTP: true,
});

const CreateUser = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.firstName || !data.lastName || !data.pass || !data.email) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            }
            let hasePass = commont.hashPassword(data.pass);
            let keyVerify = commont.randomString();

            verifier_email.verify(
                data.email,
                { hardRefresh: true },
                async (err, res) => {
                    if (err) {
                        throw err;
                    }
                    if (res.smtpCheck === "false") {
                        resolve({
                            errCode: 3,
                            errMessage:
                                "Email này không tồn tại, vui lòng kiểm tra lỗi chính tả!",
                        });
                        return;
                    } else {
                        if (data.firstName.length > 30 || data.lastName > 30) {
                            resolve({
                                errCode: 4,
                                errMessage: "Độ dài của tên vượt quá mức cho phép!",
                            });
                            return;
                        }

                        let [user, created] = await db.User.findOrCreate({
                            where: { email: data.email },
                            defaults: {
                                firstName: data.firstName,
                                lastName: data.lastName,
                                pass: hasePass,
                                idTypeUser: "3",
                                keyVerify: keyVerify,
                                statusUser: "wait",
                                typeAccount: "web",
                                id: uuidv4(),
                                gender: "nam",
                                birtday: "1/1/1990",
                            },
                            raw: false,
                        });

                        if (!created) {
                            //Tài khoản đã tồn tại
                            if (user.statusUser === "true") {
                                resolve({
                                    errCode: 2,
                                    errMessage: "Tài khoản này đã tồn tại!",
                                });
                            }
                            //Tài khoản chưa được xác nhận
                            else if (user.statusUser === "wait") {
                                //update data
                                user.firstName = data.firstName;
                                user.lastName = data.lastName;
                                user.pass = hasePass;
                                user.keyVerify = keyVerify;
                                await user.save();

                                //create token
                                let tokens = CreateToken(user);
                                const accessToken = await signAccessToken(user.id);
                                const refreshToken = await signRefreshToken(
                                    user.id,
                                    header["user-agent"]
                                );

                                //send email
                                let title = "Xác nhận tạo tài khoản TechStoreTvT";
                                let contentHtml = contentSendEmail(
                                    user.id,
                                    user.keyVerify,
                                    user.firstName
                                );

                                commont.sendEmail(user.email, title, contentHtml);

                                resolve({
                                    errCode: 0,
                                    errMessage: "Tài khoản chưa được xác nhận",
                                    data: {
                                        accessToken: accessToken,
                                        refreshToken: refreshToken,
                                        keyVerify,
                                    },
                                });
                            }
                        } else {
                            //create token
                            let tokens = CreateToken(user);
                            const accessToken = await signAccessToken(user.id);
                            const refreshToken = await signRefreshToken(
                                user.id,
                                header["user-agent"]
                            );

                            //send email
                            let title = "Xác nhận tạo tài khoản TechStoreTvT";
                            let contentHtml = contentSendEmail(
                                user.id,
                                user.keyVerify,
                                user.firstName
                            );

                            commont.sendEmail(user.email, title, contentHtml);

                            resolve({
                                errCode: 0,
                                errMessage: "Đã tạo tài khoản",
                                data: {
                                    accessToken: accessToken,
                                    refreshToken: refreshToken,
                                    keyVerify,
                                },
                            });
                        }
                    }
                }
            );
        } catch (e) {
            console.log("lỗi");
            reject(e);
        }
    });
};

const contentSendEmail = (idUser, keyVerify, firstName) => {
    return `
    <div style="width: 500px;margin: 0 auto; max-width: 100%;border: 1px solid #ccc;">
    <div style="background-color: #cfcfcf59;
    padding-top: 10px;">
        <div
            style="background-image: url(https://res.cloudinary.com/dultkpqjp/image/upload/v1683945571/image_twddrb.png);background-size: cover;width: 130px;height: 54px;">
        </div>
    </div>
    <div style="    padding: 10px;">
        <h3 style="    margin-top: 30px;">Xin chào, ${firstName}</h3>
        <div style="margin-bottom: 10px;">Cảm ơn bạn đã ghé thăm và sử dụng dịch vụ của chúng tôi.</div>
        <div>Để kích hoạt tài khoản của bạn, xin vui lòng bấm vào xác nhận bên dưới</div>
        <div style="    text-align: center;">
            <a href="${process.env.LINK_FONTEND}/account/verify?id=${idUser}&keyVerify=${keyVerify}" style="    padding: 10px 20px;
        border: none;
        color: #fff;
        background-color: #000958;
        border-radius: 4px;
        cursor: pointer;
        display: block;
        width: fit-content;
        margin: 14px auto;text-decoration: none;">Kích hoạt</a>
        </div>
        <div>Nếu bạn không liên hệ với TechStore hoặc cảm thấy mình nhận được thông báo này do nhầm lẫn, chỉ cần bỏ
            qua
            email này để hệ thống của chúng tôi tự động xóa.
        </div>
    </div>
    <div style="background-color: #cfcfcf59;
    padding: 20px 0;
    margin: 20px 0px 0px;
    text-align: center;">Copyright © 2022. All rights reserved.</div>
</div>
    `;
};

const CreateToken = (user) => {
    const { id, idGoogle, firstName, idTypeUser } = user;
    const accessToken = jwt.sign(
        { id, idGoogle, firstName, idTypeUser },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "120m",
        }
    );
    const refreshToken = jwt.sign(
        { id, idGoogle, firstName, idTypeUser },
        process.env.REFESH_TOKEN_SECRET,
        {
            expiresIn: "7d",
        }
    );

    return { accessToken, refreshToken };
};

const verifyCreateUser = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.id || !data.keyVerify) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        id: data.id,
                        keyVerify: data.keyVerify,
                        statusUser: "wait",
                    },
                    raw: false,
                });

                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage:
                            "Tài khoản không tồn tại hoặc đã được kích hoạt từ trước đó!",
                    });
                } else {
                    user.statusUser = "true";

                    await user.save();

                    resolve({
                        errCode: 0,
                        errMessage:
                            "Kích hoạt tài khoản thành công. Cảm ơn vì đã xác nhận.",
                        keyVerify: data.keyVerify,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const userLogin = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.pass) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                console.log('vao 1');
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                    },
                });
                console.log('vao 2');

                if (
                    !user ||
                    user.statusUser === "wait" ||
                    !commont.comparePassword(data.pass, user.pass)
                ) {
                    resolve({
                        errCode: 2,
                        errMessage: "Tài khoản hoặc mật khẩu không chính xác!",
                    });
                } else {
                    //check block VV
                    if (user.statusUser === "false") {
                        resolve({
                            errCode: 3,
                            errMessage: "Tài khoản đã bị khóa vô thời hạn!",
                        });
                    } else if (user.statusUser === "true") {
                        let tokens = CreateToken(user);
                        const accessToken = await signAccessToken(user.id);
                        const refreshToken = await signRefreshToken(
                            user.id,
                            header["user-agent"]
                        );
                        resolve({
                            errCode: 0,
                            errMessage: "Đăng nhập thành công!",
                            data: {
                                accessToken,
                                refreshToken,
                                id: user.id,
                            },
                        });
                    } else {
                        let timeBlock = +user.statusUser;
                        let timeCurrent = new Date().getTime();
                        if (timeBlock < timeCurrent) {
                            let tokens = CreateToken(user);
                            const accessToken = await signAccessToken(user.id);
                            const refreshToken = await signRefreshToken(
                                user.id,
                                header["user-agent"]
                            );
                            resolve({
                                errCode: 0,
                                errMessage: "Đăng nhập thành công!",
                                data: {
                                    accessToken,
                                    refreshToken,
                                    id: user.id,
                                },
                            });
                        } else {
                            //check thời gian còn lại khi bị khóa
                            let remaining = timeBlock - timeCurrent;
                            let H = Math.floor(remaining / 3600000);
                            remaining = remaining - H * 3600000;
                            let M = Math.floor(remaining / 60000);
                            resolve({
                                errCode: 4,
                                errMessage: `Vui lòng chờ sau ${H} giờ ${M} phút để tiếp tục!`,
                            });
                        }
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const refreshToken = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.refreshToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                //decode refreshToken
                let decoded = await verifyRefreshToken(
                    data.refreshToken,
                    header["user-agent"]
                );

                if (decoded !== null) {
                    let tokens = CreateToken(decoded);
                    const accessToken = await signAccessToken(decoded.id);
                    const refreshToken = await signRefreshToken(
                        decoded.id,
                        header["user-agent"]
                    );
                    resolve({
                        errCode: 0,
                        errMessage: "Tạo token thành công!",
                        data: {
                            accessToken,
                            refreshToken,
                        },
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "RefreshToken đã hết hạn hoặc không thể giải mã!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getUserLogin = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            // throw createError.InternalServerError();
            let user = await db.User.findOne({
                where: {
                    id: payload.id,
                },
                attributes: {
                    exclude: ["pass", "keyVerify", "createdAt", "updatedAt"],
                },
            });

            if (user) {
                let date = new Date().getTime();
                if (user.statusUser !== "wait" && user.statusUser !== "false") {
                    if (user.statusUser === "true") {
                        resolve({
                            errCode: 0,
                            errMessage: "Get user succeed!",
                            data: user,
                        });
                    } else {
                        if (+user.statusUser < date) {
                            resolve({
                                errCode: 0,
                                errMessage: "Get user succeed!",
                                data: user,
                            });
                        } else {
                            resolve({
                                errCode: 3,
                                errMessage: "Not found user!",
                            });
                        }
                    }
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "User was blocked!",
                    });
                }
            } else {
                resolve({
                    errCode: 3,
                    errMessage: "Not found user!",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getUserLoginRefreshToken = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.refreshToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                //decode accessToken
                let decoded = commont.decodeToken(
                    data.refreshToken,
                    process.env.REFESH_TOKEN_SECRET
                );

                if (decoded !== null) {
                    let user = await db.User.findOne({
                        where: {
                            id: decoded.id,
                        },
                        attributes: {
                            exclude: ["pass", "keyVerify", "createdAt", "updatedAt"],
                        },
                    });

                    if (user) {
                        let date = new Date().getTime();
                        if (user.statusUser !== "wait" && user.statusUser !== "false") {
                            if (user.statusUser === "true") {
                                resolve({
                                    errCode: 0,
                                    errMessage: "Get user succeed!",
                                    data: user,
                                    tokens: CreateToken(user),
                                });
                            } else {
                                if (+user.statusUser < date) {
                                    resolve({
                                        errCode: 0,
                                        errMessage: "Get user succeed!",
                                        data: user,
                                        tokens: CreateToken(user),
                                    });
                                } else {
                                    resolve({
                                        errCode: 3,
                                        errMessage: "Not found user!",
                                    });
                                }
                            }
                        } else {
                            resolve({
                                errCode: 3,
                                errMessage: "Not found user!",
                            });
                        }
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: "Not found user!",
                        });
                    }
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "refreshToken đã hết hạn hoặc không thể giải mã!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const loginGoogle = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.firstName || !data.lastName || !data.idGoogle || !data.avatar) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                //
                let [user, created] = await db.User.findOrCreate({
                    where: {
                        idGoogle: data.idGoogle.toString(),
                        typeAccount: "google",
                    },
                    defaults: {
                        firstName: data.firstName,
                        lastName: data.lastName,

                        idTypeUser: "3",

                        statusUser: "true",
                        avatarGoogle: data.avatar,
                        id: uuidv4(),
                        gender: "nam",
                        birtday: "1/1/1990",
                    },
                    raw: false,
                });

                if (user.statusUser === "true") {
                    if (user.avatarUpdate) {
                        user.avatarGoogle = data.avatar;
                        await user.save();
                    }
                    //create token
                    let tokens = CreateToken(user);
                    const accessToken = await signAccessToken(user.id);
                    const refreshToken = await signRefreshToken(
                        user.id,
                        header["user-agent"]
                    );
                    resolve({
                        errCode: 0,
                        errMessage: "Đăng nhập thành công!",
                        data: {
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            id: user.id,
                        },
                    });
                } else if (user.statusUser === "false") {
                    resolve({
                        errCode: 2,
                        errMessage: "Tài khoản đã bị khóa vĩnh viễn!",
                    });
                } else {
                    const date = new Date().getTime();
                    if (+user.statusUser > date) {
                        let remaining = +user.statusUser - date;
                        let H = Math.floor(remaining / 3600000);
                        remaining = remaining - H * 3600000;
                        let M = Math.floor(remaining / 60000);

                        resolve({
                            errCode: 4,
                            errMessage: `Vui lòng chờ sau ${H} giờ ${M} phút để tiếp tục!`,
                        });
                    } else {
                        if (user.avatarUpdate) {
                            user.avatarGoogle = data.avatar;
                            await user.save();
                        }
                        //create token
                        let tokens = CreateToken(user);
                        const accessToken = await signAccessToken(user.id);
                        const refreshToken = await signRefreshToken(
                            user.id,
                            header["user-agent"]
                        );
                        resolve({
                            errCode: 0,
                            errMessage: "Đăng nhập thành công!",
                            data: {
                                accessToken: accessToken,
                                refreshToken: refreshToken,
                                id: user.id,
                            },
                        });
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const loginFacebook = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.firstName ||
                !data.lastName ||
                !data.idFacebook ||
                !data.avatarFacebook
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                //
                let [user, created] = await db.User.findOrCreate({
                    where: { idFacebook: data.idFacebook.toString() },
                    defaults: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: "none",
                        idTypeUser: "3",
                        typeAccount: "facebook",

                        statusUser: "true",
                        avatarFacebook: data.avatarFacebook,
                        id: uuidv4(),
                        gender: "nam",
                        birtday: "1/1/1990",
                    },
                    raw: false,
                });

                if (user.statusUser === "true") {
                    if (user.avatarUpdate) {
                        user.avatarFacebook = data.avatarFacebook;
                        await user.save();
                    }

                    //create token
                    let tokens = CreateToken(user);
                    const accessToken = await signAccessToken(user.id);
                    const refreshToken = await signRefreshToken(
                        user.id,
                        header["user-agent"]
                    );
                    resolve({
                        errCode: 0,
                        errMessage: "Đăng nhập thành công!",
                        data: {
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                        },
                    });
                } else if (user.statusUser === "false") {
                    resolve({
                        errCode: 2,
                        errMessage: "Tài khoản đã bị khóa vĩnh viễn!",
                    });
                } else if (user.statusUser === "wait") {
                    resolve({
                        errCode: 3,
                        errMessage: "Tài khoản chưa được kích hoạt!",
                    });
                } else {
                    const date = new Date().getTime();
                    if (+user.statusUser > date) {
                        let remaining = +user.statusUser - date;
                        let H = Math.floor(remaining / 3600000);
                        remaining = remaining - H * 3600000;
                        let M = Math.floor(remaining / 60000);

                        resolve({
                            errCode: 4,
                            errMessage: `Vui lòng chờ sau ${H} giờ ${M} phút để tiếp tục!`,
                        });
                    } else {
                        if (user.avatarUpdate) {
                            user.avatarFacebook = data.avatarFacebook;
                            await user.save();
                        }
                        //create token
                        let tokens = CreateToken(user);
                        const accessToken = await signAccessToken(user.id);
                        const refreshToken = await signRefreshToken(
                            user.id,
                            header["user-agent"]
                        );
                        resolve({
                            errCode: 0,
                            errMessage: "Đăng nhập thành công!",
                            data: {
                                accessToken: accessToken,
                                refreshToken: refreshToken,
                            },
                        });
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const loginGithub = (data, header) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.firstName || !data.idGithub || !data.avatarGithub) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                //
                let [user, created] = await db.User.findOrCreate({
                    where: { idGithub: data.idGithub.toString() },
                    defaults: {
                        firstName: data.firstName,
                        lastName: "0",
                        // email: 'none',
                        idTypeUser: "3",
                        typeAccount: "github",

                        statusUser: "true",
                        avatarGithub: data.avatarGithub,
                        id: uuidv4(),
                        gender: "nam",
                        birtday: "1/1/1990",
                    },
                    raw: false,
                });

                if (user.statusUser === "true") {
                    if (user.avatarUpdate) {
                        user.avatarGithub = data.avatarGithub;
                        await user.save();
                    }

                    //create token
                    let tokens = CreateToken(user);
                    const accessToken = await signAccessToken(user.id);
                    const refreshToken = await signRefreshToken(
                        user.id,
                        header["user-agent"]
                    );
                    resolve({
                        errCode: 0,
                        errMessage: "Đăng nhập thành công!",
                        data: {
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                        },
                    });
                } else if (user.statusUser === "false") {
                    resolve({
                        errCode: 2,
                        errMessage: "Tài khoản đã bị khóa vĩnh viễn!",
                    });
                } else if (user.statusUser === "wait") {
                    resolve({
                        errCode: 3,
                        errMessage: "Tài khoản chưa được kích hoạt!",
                    });
                } else {
                    const date = new Date().getTime();
                    if (+user.statusUser > date) {
                        let remaining = +user.statusUser - date;
                        let H = Math.floor(remaining / 3600000);
                        remaining = remaining - H * 3600000;
                        let M = Math.floor(remaining / 60000);

                        resolve({
                            errCode: 4,
                            errMessage: `Vui lòng chờ sau ${H} giờ ${M} phút để tiếp tục!`,
                        });
                    } else {
                        //create token
                        if (user.avatarUpdate) {
                            user.avatarGithub = data.avatarGithub;
                            await user.save();
                        }
                        let tokens = CreateToken(user);
                        const accessToken = await signAccessToken(user.id);
                        const refreshToken = await signRefreshToken(
                            user.id,
                            header["user-agent"]
                        );
                        resolve({
                            errCode: 0,
                            errMessage: "Đăng nhập thành công!",
                            data: {
                                accessToken: accessToken,
                                refreshToken: refreshToken,
                            },
                        });
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const addProductToCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("api add cart");
            if (
                !data.idProduct ||
                !data.amount ||
                !data.idClassifyProduct ||
                !data.accessToken
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let idUser = payload.id;

                //check exits product and classify
                let product = await db.product.findOne({
                    where: { id: data.idProduct },
                });
                let classifyProduct = await db.classifyProduct.findOne({
                    where: {
                        id: data.idClassifyProduct,
                        idProduct: data.idProduct,
                    },
                });
                if (!product || !classifyProduct) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Lỗi không tìm thấy sản phẩm hoặc phân loại, vui lòng thử lại sau!",
                    });
                } else {
                    if (product.isSell === "false") {
                        resolve({
                            errCode: 4,
                            errMessage: "Sản phẩm đã ngừng bán!",
                        });
                        return;
                    }
                    if (+data.amount > classifyProduct.amount) {
                        resolve({
                            errCode: 5,
                            errMessage: "Hàng trong kho không còn đủ!",
                        });
                        return;
                    }

                    let [cart, create] = await db.cart.findOrCreate({
                        where: {
                            idUser: idUser,
                            idProduct: data.idProduct,
                            idClassifyProduct: data.idClassifyProduct,
                        },
                        defaults: {
                            amount: +data.amount,
                            isChoose: "false",
                            id: uuidv4(),
                        },
                        raw: false,
                    });
                    if (!create) {
                        cart.amount =
                            cart.amount + data.amount * 1 <= classifyProduct.amount
                                ? cart.amount + data.amount * 1
                                : classifyProduct.amount;
                        await cart.save();
                        resolve({
                            errCode: 0,
                            errMessage: "Đã thêm vào giỏ hàng",
                        });
                    } else {
                        resolve({
                            errCode: 0,
                            errMessage: "Đã thêm vào giỏ hàng",
                        });
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const addCartOrMoveCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.idProduct ||
                !data.amount ||
                !data.idClassifyProduct ||
                !data.accessToken
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let idUser = payload.id;

                //check exits product and classify
                let product = await db.product.findOne({
                    where: { id: data.idProduct },
                });
                let classifyProduct = await db.classifyProduct.findOne({
                    where: {
                        id: data.idClassifyProduct,
                        idProduct: data.idProduct,
                    },
                });
                if (!product || !classifyProduct) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Lỗi không tìm thấy sản phẩm hoặc phân loại, vui lòng thử lại sau!",
                    });
                } else {
                    if (product.isSell === "false") {
                        resolve({
                            errCode: 4,
                            errMessage: "Sản phẩm đã ngừng bán!",
                        });
                        return;
                    }

                    let [cart, create] = await db.cart.findOrCreate({
                        where: {
                            idUser: idUser,
                            idProduct: data.idProduct,
                            idClassifyProduct: data.idClassifyProduct,
                        },
                        defaults: {
                            id: uuidv4(),
                            amount: +data.amount,
                        },
                        raw: false,
                    });
                    if (!create) {
                        let sl = classifyProduct.amount;
                        cart.amount =
                            cart.amount + +data.amount <= sl
                                ? cart.amount + +data.amount
                                : sl;
                        await cart.save();

                        resolve({
                            errCode: 0,
                            errMessage: "Sản phẩm đã có trong giỏ hàng",
                        });
                    } else {
                        resolve({
                            errCode: 0,
                            errMessage: "Đã thêm vào giỏ hàng",
                        });
                    }
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const addNewAddressUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                data.country === "-1" ||
                data.district === "-1" ||
                !data.nameAddress ||
                !data.nameUser ||
                !data.sdtUser ||
                !data.addressText ||
                !data.accessToken
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let idUser = payload.id;
                //kiem tra sdt

                let [addressUser, create] = await db.addressUser.findOrCreate({
                    where: {
                        idUser,
                        nameAddress: data.nameAddress.toLowerCase(),
                    },
                    defaults: {
                        isDefault: "false",
                        fullname: data.nameUser,
                        sdt: data.sdtUser,
                        country: data.country,
                        district: data.district,
                        addressText: data.addressText,
                        id: uuidv4(),
                        status: "true",
                    },
                    raw: false,
                });

                if (!create) {
                    let checkStatusAdress = await db.addressUser.findOne({
                        where: {
                            idUser,
                            nameAddress: data.nameAddress.toLowerCase(),
                        },
                    });

                    if (checkStatusAdress.status === "true") {
                        resolve({
                            errCode: 3,
                            errMessage: "Tên địa chỉ này đã tồn tại!",
                        });
                    } else {
                        let updateAddress = await db.addressUser.findOne({
                            where: {
                                idUser,
                                isDefault: "true",
                                status: "true",
                            },
                            raw: false,
                        });
                        if (updateAddress) {
                            updateAddress.isDefault = "false";
                            await updateAddress.save();
                        }

                        addressUser.status = "true";
                        addressUser.isDefault = "true";
                        addressUser.fullname = data.nameUser;
                        addressUser.sdt = data.sdtUser;
                        addressUser.country = data.country;
                        addressUser.district = data.district;
                        addressUser.addressText = data.addressText;

                        await addressUser.save();

                        resolve({
                            errCode: 0,
                            errMessage: "Thêm địa chỉ thành công.",
                        });
                    }
                } else {
                    let updateAddress = await db.addressUser.findOne({
                        where: {
                            idUser,
                            isDefault: "true",
                        },
                        raw: false,
                    });
                    if (updateAddress) {
                        updateAddress.isDefault = "false";
                        await updateAddress.save();
                    }

                    addressUser.isDefault = "true";
                    await addressUser.save();

                    resolve({
                        errCode: 0,
                        errMessage: "Thêm địa chỉ thành công.",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getAddressUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let idUser = payload.id;

                let addressUser = await db.addressUser.findAll({
                    where: {
                        idUser,
                        status: "true",
                    },
                    order: [["id", "ASC"]],
                });

                if (addressUser) {
                    resolve({
                        errCode: 0,
                        data: addressUser,
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Not found!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const setDefaultAddress = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let address = await db.addressUser.findOne({
                    where: {
                        idUser,
                        isDefault: "true",
                    },
                    raw: false,
                });
                if (address) {
                    address.isDefault = "false";
                    await address.save();
                }

                let addressUser = await db.addressUser.findOne({
                    where: {
                        id: data.id,
                    },
                    raw: false,
                });

                if (addressUser) {
                    addressUser.isDefault = "true";
                    addressUser.save();

                    resolve({
                        errCode: 0,
                        errMessage: "success",
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy địa chỉ này!",
                        decode,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteAddressUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let address = await db.addressUser.findOne({
                    where: {
                        idUser,
                        id: data.id,
                    },
                    raw: false,
                });
                if (address) {
                    address.isDefault = "false";
                    address.status = "false";
                    await address.save();

                    let addressDefault = await db.addressUser.findOne({
                        where: {
                            idUser,
                            isDefault: "true",
                            status: "true",
                        },
                    });
                    if (!addressDefault) {
                        let addressDefault2 = await db.addressUser.findOne({
                            where: {
                                idUser,
                                isDefault: "false",
                                status: "true",
                            },
                            raw: false,
                        });

                        if (addressDefault2) {
                            addressDefault2.isDefault = "true";
                            await addressDefault2.save();
                        }
                    }

                    resolve({
                        errCode: 0,
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy địa chỉ này!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const editAddressUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.id ||
                data.country === "-1" ||
                data.district === "-1" ||
                !data.nameUser ||
                !data.nameAddress ||
                !data.sdtUser ||
                !data.addressText
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let check = await db.addressUser.findOne({
                    where: {
                        idUser,
                        nameAddress: data.nameAddress,
                        id: {
                            [Op.ne]: data.id,
                        },
                        status: "true",
                    },
                });

                if (!check) {
                    let address = await db.addressUser.findOne({
                        where: {
                            idUser,
                            id: data.id,
                        },
                        raw: false,
                    });

                    if (address) {
                        address.nameAddress = data.nameAddress;
                        address.fullname = data.nameUser;
                        address.sdt = data.sdtUser;
                        address.country = data.country;
                        address.district = data.district;
                        address.addressText = data.addressText;

                        await address.save();

                        resolve({
                            errCode: 0,
                        });
                    } else {
                        resolve({
                            errCode: 3,
                            errMessage: "Không tìm thấy địa chỉ này",
                        });
                    }
                } else {
                    resolve({
                        errCode: 4,
                        errMessage: "Tên địa chỉ này đã tồn tại!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListCartUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let carts = await db.cart.findAll({
                    where: {
                        idUser,
                    },
                    include: [
                        {
                            model: db.classifyProduct,
                        },
                        {
                            model: db.product,
                            include: [
                                {
                                    model: db.imageProduct,
                                    as: "imageProduct-product",
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt", "id"],
                                    },
                                },
                                {
                                    model: db.promotionProduct,
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt", "id"],
                                    },
                                },
                                {
                                    model: db.classifyProduct,
                                    as: "classifyProduct-product",
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt"],
                                    },
                                },
                            ],
                            raw: false,
                            nest: true,
                        },
                    ],
                    order: [["stt", "DESC"]],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: carts,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const editAmountCartUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id || !data.typeEdit) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let cart = await db.cart.findOne({
                    where: {
                        idUser,
                        id: data.id,
                    },
                    raw: false,
                });

                if (cart) {
                    let cartTemp = await db.cart.findOne({
                        where: {
                            idUser,
                            id: data.id,
                        },
                    });

                    if (data.typeEdit === "prev") {
                        if (cartTemp.amount !== 1) {
                            cart.amount = cart.amount - 1;
                            await cart.save();
                        }
                        resolve({
                            errCode: 0,
                        });
                    } else if (data.typeEdit === "next") {
                        let classifyProduct = await db.classifyProduct.findOne({
                            where: {
                                id: cartTemp.idClassifyProduct,
                            },
                        });

                        let sl = classifyProduct.amount;

                        if (cartTemp.amount < sl) {
                            cart.amount = cart.amount + 1;
                            await cart.save();
                            resolve({
                                errCode: 0,
                            });
                        } else {
                            resolve({
                                errCode: 4,
                                errMessage:
                                    "Xin lỗi, số lượng sản phẩm trong kho không còn đủ!",
                            });
                            return;
                        }
                    } else if (data.typeEdit === "value") {
                        let classifyProduct = await db.classifyProduct.findOne({
                            where: {
                                id: cartTemp.idClassifyProduct,
                            },
                        });

                        let sl = classifyProduct.amount;
                        if (Number.isInteger(+data.value)) {
                            if (+data.value < 1) {
                                cart.amount = 1;
                                await cart.save();
                                resolve({
                                    errCode: 0,
                                });
                            } else if (+data.value > sl) {
                                cart.amount = sl;
                                await cart.save();
                                resolve({
                                    errCode: 4,
                                    errMessage: `Rất tiếc số lượng trong kho chỉ còn ${sl} sản phẩm!`,
                                });
                            } else {
                                cart.amount = +data.value;
                                await cart.save();
                                resolve({
                                    errCode: 0,
                                });
                            }
                        } else {
                            cart.amount = 1;
                            await cart.save();
                        }
                    }
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy sản phẩm trong giỏ hàng!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const chooseProductInCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let cart = await db.cart.findOne({
                    where: {
                        idUser,
                        id: data.id,
                    },
                    raw: false,
                });
                if (!cart) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy sản phẩm này trong giỏ hàng!",
                    });
                } else {
                    cart.isChoose = cart.isChoose === "true" ? "false" : "true";
                    await cart.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteProductInCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let cart = await db.cart.findOne({
                    where: {
                        idUser,
                        id: data.id,
                    },
                    raw: false,
                });
                if (!cart) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy sản phẩm này trong giỏ hàng!",
                    });
                } else {
                    await cart.destroy();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateClassifyProductInCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idCart || !data.idClassify) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let classifyProduct = await db.classifyProduct.findOne({
                    where: {
                        id: data.idClassify,
                    },
                });

                if (classifyProduct) {
                    let cart = await db.cart.findOne({
                        where: {
                            idUser,
                            id: data.idCart,
                        },
                        raw: false,
                    });

                    if (cart) {
                        cart.idClassifyProduct = classifyProduct.id;
                        cart.amount = 1;
                        await cart.save();
                    }

                    resolve({
                        errCode: 0,
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy loại sản phẩm!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewBill = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.Totals) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let addressUser = await db.addressUser.findOne({
                    where: {
                        idUser,
                        isDefault: "true",
                    },
                });

                let cart = await db.cart.findAll({
                    where: {
                        idUser,
                        isChoose: "true",
                    },
                    raw: true,
                });

                if (!addressUser) {
                    resolve({
                        errCode: 3,
                        errMessage: "Vui lòng chọn địa chỉ nhận hàng!",
                    });
                    return;
                }

                if (cart.length === 0) {
                    resolve({
                        errCode: 4,
                        errMessage: "Vui lòng chọn sản phẩm bạn muốn mua!",
                    });
                    return;
                }

                //check sell product
                let listIdProduct = cart.map((item) => item.idProduct);

                let productUnSell = await db.product.findOne({
                    where: {
                        id: {
                            [Op.in]: listIdProduct,
                        },
                        isSell: "false",
                    },
                });

                if (productUnSell) {
                    resolve({
                        errCode: 5,
                        errMessage: `Sản phẩm "${productUnSell.nameProduct}" đã không còn bán nửa.`,
                    });
                    return;
                }

                //check amount
                let listIdClassify = cart.map((item) => item.idClassifyProduct);
                let listClassify = await db.classifyProduct.findAll({
                    where: {
                        id: {
                            [Op.in]: listIdClassify,
                        },
                    },
                });
                let checkAmountClassify = true;
                for (let i = 0; i < cart.length; i++)
                    for (let j = 0; j < listClassify.length; j++) {
                        if (listClassify[j].id === cart[i].idClassifyProduct) {
                            if (listClassify[j].amount < cart[i].amount) {
                                checkAmountClassify = false;
                                break;
                            }
                        }
                    }

                if (!checkAmountClassify) {
                    resolve({
                        errCode: 6,
                        errMessage: `Vui lòng chọn số lượng phù hợp hoặc thay đổi phân loại sản phẩm!`,
                    });
                    return;
                }

                //handle buy product
                let date = new Date().getTime();

                let bill = await db.bill.create({
                    id: uuidv4(),
                    idUser,
                    timeBill: date.toString(),
                    idStatusBill: 1,
                    idAddressUser: addressUser.id,
                    note: data.note || "",
                    totals: +data.Totals,
                    payment: "hand",
                });

                await db.statusBills.create({
                    id: uuidv4(),
                    idBill: bill.id,
                    nameStatus: "Đặt hàng",
                    idStatusBill: bill.idStatusBill,
                    timeStatus: date,
                });

                let arrayDetailBill = cart.map((item) => {
                    return {
                        id: uuidv4(),
                        idBill: bill.id,
                        idProduct: item.idProduct,
                        amount: item.amount,
                        isReviews: "false",
                        idClassifyProduct: item.idClassifyProduct,
                    };
                });

                await db.detailBill.bulkCreate(arrayDetailBill, {
                    individualHooks: true,
                });

                cart.forEach(async (item) => {
                    let classify = await db.classifyProduct.findOne({
                        where: {
                            id: item.idClassifyProduct,
                        },
                        raw: false,
                    });
                    if (classify) {
                        classify.amount = classify.amount - item.amount;
                        await classify.save();
                    }
                });

                await db.cart.destroy({
                    where: {
                        idUser,
                        isChoose: "true",
                    },
                });

                let date2 = new Date();
                let month = date2.getMonth() + 1;
                let year = date2.getFullYear();

                let moneyBill = await db.moneyBills.findOne({
                    where: {
                        month,
                        year,
                        type: "ban",
                    },
                    raw: false,
                });

                if (moneyBill) {
                    moneyBill.money = moneyBill.money + +data.Totals;
                    await moneyBill.save();
                } else {
                    await db.moneyBills.create({
                        id: uuidv4(),
                        year,
                        month,
                        type: "ban",
                        money: +data.Totals,
                    });
                }

                handleEmit("refreshAmountProduct", {});

                resolve({
                    errCode: 0,
                    idBill: bill.id,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const chooseAllProductInCart = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                await db.cart.update(
                    {
                        isChoose: data.type ? "true" : "false",
                    },
                    {
                        where: {
                            idUser,
                        },
                    }
                );

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListBillByType = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.type) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let countType1 = await db.bill.count({
                    where: {
                        idUser,
                        idStatusBill: "1",
                    },
                });
                let countType2 = await db.bill.count({
                    where: {
                        idUser,
                        idStatusBill: "2",
                    },
                });

                if (+data.type === 1 || +data.type === 3 || +data.type === 4) {
                    let listBills = await db.bill.findAll({
                        where: {
                            idUser,
                            idStatusBill: +data.type,
                        },
                        limit: 5,
                        offset: data.offset,
                        include: [
                            {
                                model: db.detailBill,
                                include: [
                                    {
                                        model: db.product,
                                        include: [
                                            {
                                                model: db.imageProduct,
                                                as: "imageProduct-product",
                                            },
                                            { model: db.promotionProduct },
                                        ],
                                    },
                                    {
                                        model: db.classifyProduct,
                                    },
                                ],
                            },
                        ],
                        order: [["updatedAt", "DESC"]],
                        raw: false,
                        nest: true,
                    });
                    let count = await db.bill.count({
                        where: {
                            idUser,
                            idStatusBill: +data.type,
                        },
                    });
                    resolve({
                        errCode: 0,
                        data: listBills,
                        count,
                        countType1,
                        countType2,
                    });
                } else if (+data.type >= 2 && +data.type < 3) {
                    let listBills = await db.bill.findAll({
                        where: {
                            idUser,
                            [Op.and]: [
                                {
                                    idStatusBill: {
                                        [Op.gte]: 2,
                                    },
                                },
                                {
                                    idStatusBill: {
                                        [Op.lt]: 3,
                                    },
                                },
                            ],
                        },
                        limit: 5,
                        offset: data.offset,
                        include: [
                            {
                                model: db.detailBill,
                                include: [
                                    {
                                        model: db.product,
                                        include: [
                                            {
                                                model: db.imageProduct,
                                                as: "imageProduct-product",
                                            },
                                            { model: db.promotionProduct },
                                        ],
                                    },
                                    {
                                        model: db.classifyProduct,
                                    },
                                ],
                            },
                        ],
                        order: [["updatedAt", "DESC"]],
                        raw: false,
                        nest: true,
                    });
                    let count = await db.bill.count({
                        where: {
                            idUser,
                            idStatusBill: data.type,
                        },
                    });
                    resolve({
                        errCode: 0,
                        data: listBills,
                        count,
                        countType1,
                        countType2,
                    });
                } else {
                    let listBills = await db.bill.findAll({
                        where: {
                            idUser,
                        },
                        limit: 5,
                        offset: data.offset,
                        include: [
                            {
                                model: db.detailBill,
                                include: [
                                    {
                                        model: db.product,
                                        include: [
                                            {
                                                model: db.imageProduct,
                                                as: "imageProduct-product",
                                            },
                                            { model: db.promotionProduct },
                                        ],
                                    },
                                    {
                                        model: db.classifyProduct,
                                    },
                                ],
                            },
                        ],
                        order: [["updatedAt", "DESC"]],
                        raw: false,
                        nest: true,
                    });

                    let count = await db.bill.count({
                        where: {
                            idUser,
                        },
                    });
                    resolve({
                        errCode: 0,
                        data: listBills,
                        count,
                        countType1,
                        countType2,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const userCancelBill = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id || !data.note) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let bill = await db.bill.findOne({
                    where: {
                        id: data.id,
                    },
                    include: [
                        {
                            model: db.User,
                            where: {
                                id: idUser,
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                if (!bill) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy hóa đơn!",
                        decode,
                    });
                } else {
                    bill.idStatusBill = 4;
                    bill.noteCancel = data.note;
                    bill.timeBill = new Date().getTime().toString();
                    await bill.save();

                    await db.statusBills.create({
                        id: uuidv4(),
                        idBill: bill.id,
                        nameStatus: "Đã hủy",
                        idStatusBill: 4,
                        timeStatus: new Date().getTime(),
                    });

                    //increase amount product
                    let detailBills = await db.detailBill.findAll({
                        where: {
                            idBill: bill.id,
                        },
                    });

                    detailBills.forEach(async (item) => {
                        let classify = await db.classifyProduct.findOne({
                            where: {
                                id: item.idClassifyProduct,
                            },
                            raw: false,
                        });
                        if (classify) {
                            classify.amount = classify.amount + item.amount;
                            await classify.save();
                        }
                    });

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const userRepurchaseBill = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let bill = await db.bill.findOne({
                    where: {
                        id: data.id,
                    },
                    include: [
                        {
                            model: db.User,
                            where: {
                                id: idUser,
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                if (!bill) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy hóa đơn!",
                        decode,
                    });
                } else {
                    let detailBill = await db.detailBill.findAll({
                        where: {
                            idBill: bill.id,
                        },
                    });

                    let array = detailBill.map((item) => {
                        return {
                            id: uuidv4(),
                            idUser,
                            idProduct: item.idProduct,
                            amount: item.amount,
                            idClassifyProduct: item.idClassifyProduct,
                            isChoose: "false",
                        };
                    });

                    await db.cart.bulkCreate(array, { individualHooks: true });

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getCodeVeridyForgetPass = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                    },
                    raw: false,
                });
                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Email không chính xác hoặc chưa được đăng kí!",
                    });
                } else {
                    let timeCurrent = new Date().getTime();
                    if (user.statusUser === "false") {
                        resolve({
                            errCode: 3,
                            errMessage: "Tài khoản đã bị khóa vĩnh viễn!",
                        });
                        return;
                    } else if (
                        user.statusUser !== "true" &&
                        +user.statusUser > timeCurrent
                    ) {
                        resolve({
                            errCode: 3,
                            errMessage: "Tài khoản đang bị tạm khóa!",
                        });
                        return;
                    }

                    //gửi email
                    let rd = Math.floor(Math.random() * 900000) + 100000;
                    user.keyVerify = rd.toString();
                    await user.save();

                    commont.sendEmail(
                        data.email,
                        "Mã xác nhận TechStoreTvT",
                        `<h3>Mã xác nhận của bạn là: ${rd}</h3>
                        <div>Lưu ý: không gửi mã này cho bất kì ai.</div>
                        `
                    );

                    resolve({
                        errCode: 0,
                        // keyVerify: rd.toString()
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const changePassForget = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.keyVerify || !data.pass) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                        keyVerify: data.keyVerify,
                    },
                    raw: false,
                });
                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Có lỗi xảy ra vui lòng thử lại sau!",
                    });
                } else {
                    let hasePass = commont.hashPassword(data.pass);

                    user.pass = hasePass;
                    await user.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const checkKeyVerify = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.keyVerify) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                        keyVerify: data.keyVerify,
                    },
                    raw: false,
                });
                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Mã xác nhận không chính xác!",
                    });
                } else {
                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const hasReceivedProduct = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.id) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let bill = await db.bill.findOne({
                    where: {
                        idUser,
                        id: data.id,
                    },
                    raw: false,
                });

                if (!bill) {
                    resolve({
                        errCode: 3,
                        errMessage: "Lỗi không tìm thấy đơn hàng!",
                    });
                } else {
                    bill.idStatusBill = 3;
                    bill.timeBill = new Date().getTime();
                    await bill.save();

                    await db.statusBills.create({
                        id: uuidv4(),
                        idBill: bill.id,
                        nameStatus: "Hoàn thành",
                        idStatusBill: 3,
                        timeStatus: new Date().getTime(),
                    });

                    let detailBill = await db.detailBill.findAll({
                        where: {
                            idBill: bill.id,
                        },
                    });

                    detailBill.forEach(async (item) => {
                        let product = await db.product.findOne({
                            where: {
                                id: item.idProduct,
                            },
                            raw: false,
                        });
                        product.sold = product.sold + item.amount;
                        await product.save();
                    });

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const buyProductByCard = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let addressUser = await db.addressUser.findOne({
                    where: {
                        idUser,
                        isDefault: "true",
                    },
                });

                let cart = await db.cart.findAll({
                    where: {
                        idUser,
                        isChoose: "true",
                    },
                    raw: true,
                });

                if (!addressUser) {
                    resolve({
                        errCode: 3,
                        errMessage: "Vui lòng chọn địa chỉ nhận hàng!",
                    });
                    return;
                }

                if (cart.length === 0) {
                    resolve({
                        errCode: 4,
                        errMessage: "Vui lòng chọn sản phẩm bạn muốn mua!",
                    });
                    return;
                }

                //check isSell product
                let listIdProduct = cart.map((item) => item.idProduct);

                let productUnSell = await db.product.findOne({
                    where: {
                        id: {
                            [Op.in]: listIdProduct,
                        },
                        isSell: "false",
                    },
                });

                if (productUnSell) {
                    resolve({
                        errCode: 5,
                        errMessage: `Sản phẩm "${productUnSell.nameProduct}" đã không còn bán nửa.`,
                    });
                    return;
                }

                //check amount
                let listIdClassify = cart.map((item) => item.idClassifyProduct);
                let listClassify = await db.classifyProduct.findAll({
                    where: {
                        id: {
                            [Op.in]: listIdClassify,
                        },
                    },
                });
                let checkAmountClassify = true;
                for (let i = 0; i < cart.length; i++)
                    for (let j = 0; j < listClassify.length; j++) {
                        if (listClassify[j].id === cart[i].idClassifyProduct) {
                            if (listClassify[j].amount < cart[i].amount) {
                                checkAmountClassify = false;
                                break;
                            }
                        }
                    }

                if (!checkAmountClassify) {
                    resolve({
                        errCode: 6,
                        errMessage: `Vui lòng chọn số lượng phù hợp hoặc thay đổi phân loại sản phẩm!`,
                    });
                    return;
                }

                //handle buy

                let cart2 = await db.cart.findAll({
                    where: {
                        idUser,
                        isChoose: "true",
                    },
                    include: [
                        {
                            model: db.product,
                        },
                        {
                            model: db.classifyProduct,
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                let totals = 0;

                let arrayProduct = cart.map((item, index) => {
                    let price;
                    if (cart2[index].classifyProduct.nameClassifyProduct === "default")
                        price = +cart2[index].product.priceProduct;
                    else price = cart2[index].classifyProduct.priceClassify;

                    totals = totals + Math.floor(price / 23000) * +item.amount;
                    price = Math.floor(price / 23000) + ".00";

                    return {
                        name: cart2[index].product.nameProduct,
                        sku: cart2[index].classifyProduct.nameClassifyProduct,
                        price: price,
                        currency: "USD",
                        quantity: +item.amount,
                    };
                });

                const create_payment_json = {
                    intent: "sale",
                    payer: {
                        payment_method: "paypal",
                    },
                    redirect_urls: {
                        return_url: `${process.env.LINK_BACKEND
                            }/api/v1/buy-product-by-card/success?price=${totals + ".00"
                            }&accessToken=${data.accessToken}&totalsReq=${data.totalsReq}`,
                        cancel_url: `${process.env.LINK_FONTEND}/cart`,
                    },
                    transactions: [
                        {
                            item_list: {
                                items: arrayProduct,
                            },
                            amount: {
                                currency: "USD",
                                total: totals + ".00",
                            },
                            description: "Shop TechStoreTvT siêu tiện siêu rẽ.",
                        },
                    ],
                };

                paypal.payment.create(create_payment_json, function (error, payment) {
                    if (error) {
                        throw error;
                    } else {
                        for (let i = 0; i < payment.links.length; i++) {
                            if (payment.links[i].rel === "approval_url") {
                                // res.redirect(payment.links[i].href);
                                resolve({
                                    errCode: 0,
                                    errMessage: "ok",
                                    link: payment.links[i].href,
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const buyProductByCardSucess = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let decode = commont.decodeToken(
                    data.accessToken,
                    process.env.ACCESS_TOKEN_SECRET
                );
                if (decode === null) {
                    resolve({
                        errCode: 2,
                        errMessage: "Kết nối quá hạn, vui lòng tải lại trang và thử lại!",
                        decode,
                    });
                } else {
                    let idUser = decode.id;

                    const payerId = data.PayerID;
                    const paymentId = data.paymentId;
                    const price = data.price;

                    const execute_payment_json = {
                        payer_id: payerId,
                        transactions: [
                            {
                                amount: {
                                    currency: "USD",
                                    total: price,
                                },
                            },
                        ],
                    };
                    paypal.payment.execute(
                        paymentId,
                        execute_payment_json,
                        async function (error, payment) {
                            if (error) {
                                console.log(error.response);
                                throw error;
                            } else {
                                // console.log('mua thanh cong');

                                let addressUser = await db.addressUser.findOne({
                                    where: {
                                        idUser,
                                        isDefault: "true",
                                    },
                                });

                                let cart = await db.cart.findAll({
                                    where: {
                                        idUser,
                                        isChoose: "true",
                                    },
                                    raw: true,
                                });

                                //handle buy product
                                let date = new Date().getTime();
                                let bill = await db.bill.create({
                                    id: uuidv4(),
                                    idUser,
                                    timeBill: date.toString(),
                                    idStatusBill: 1,
                                    idAddressUser: addressUser.id,
                                    note: data.note || "",
                                    totals: +data.totalsReq,
                                    payment: "card",
                                });
                                await db.statusBills.create({
                                    id: uuidv4(),
                                    idBill: bill.id,
                                    nameStatus: "Đặt hàng",
                                    idStatusBill: bill.idStatusBill,
                                    timeStatus: date,
                                });

                                let arrayDetailBill = cart.map((item) => {
                                    db.classifyProduct.increment(
                                        { amount: -item.amount },
                                        {
                                            where: {
                                                idProduct: item.idProduct,
                                            },
                                        }
                                    );

                                    return {
                                        id: uuidv4(),
                                        idBill: bill.id,
                                        idProduct: item.idProduct,
                                        amount: item.amount,
                                        isReviews: "false",
                                        idClassifyProduct: item.idClassifyProduct,
                                    };
                                });

                                await db.detailBill.bulkCreate(arrayDetailBill, {
                                    individualHooks: true,
                                });

                                await db.cart.destroy({
                                    where: {
                                        idUser,
                                        isChoose: "true",
                                    },
                                });

                                let date2 = new Date();
                                let month = date2.getMonth() + 1;
                                let year = date2.getFullYear();

                                let moneyBill = await db.moneyBills.findOne({
                                    where: {
                                        month,
                                        year,
                                        type: "ban",
                                    },
                                    raw: false,
                                });

                                if (moneyBill) {
                                    moneyBill.money = moneyBill.money + +data.totalsReq;
                                    await moneyBill.save();
                                } else {
                                    await db.moneyBills.create({
                                        id: uuidv4(),
                                        year,
                                        month,
                                        type: "ban",
                                        money: +data.totalsReq,
                                    });
                                }

                                handleEmit("refreshAmountProduct", {});

                                resolve({
                                    errCode: 0,
                                });
                            }
                        }
                    );
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewEvaluateProduct = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idDetailBill || !data.star) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let detailBill = await db.detailBill.findOne({
                    where: {
                        id: data.idDetailBill,
                    },
                    include: [
                        {
                            model: db.bill,
                            where: {
                                idUser,
                                idStatusBill: "3",
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                if (!detailBill || detailBill.isReviews === "true") {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Không tìm thấy hoặc bạn không được phép thực hiện tính năng này!",
                    });
                } else {
                    let evaluateProduct = await db.evaluateProduct.create({
                        id: uuidv4(),
                        idUser,
                        idProduct: detailBill.idProduct,
                        starNumber: data.star,
                        content: data.content || "",
                        displayname: "" + data.displayName || "true",
                        idDetailBill: data.idDetailBill,
                    });

                    detailBill.isReviews = "true";
                    await detailBill.save();

                    resolve({
                        errCode: 0,
                        data: {
                            id: evaluateProduct.id,
                        },
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const uploadVideoEvaluateProduct = (id, url) => {
    return new Promise(async (resolve, reject) => {
        try {
            let urlVideo = await GG_Drive.uploadFile(
                url,
                process.env.ID_FOLDER_VIDEO_EVALUATE
            );

            await db.videoEvaluateProduct.create({
                id: uuidv4(),
                idEvaluateProduct: id,
                videobase64: urlVideo.url,
                idGGDrive: urlVideo.id,
            });

            resolve({
                errCode: 0,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const uploadImagesEvaluateProduct = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let array = data.files.map((item) => {
                return {
                    id: uuidv4(),
                    imagebase64: item.path,
                    idEvaluateProduct: data.query.id,
                    idCloudinary: item.filename,
                };
            });
            await db.imageEvaluateProduct.bulkCreate(array, {
                individualHooks: true,
            });

            resolve({
                errCode: 0,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const createNewEvaluateProductFailed = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let detailbill = await db.detailBill.findOne({
                where: {
                    id: data.idDetailBill,
                },
                raw: false,
            });
            if (!detailbill) {
                resolve({
                    errCode: 1,
                    errMessage: "not found detail bill",
                });
            } else {
                detailbill.isReviews = "false";
                await detailbill.save();

                await db.evaluateProduct.destroy({
                    where: {
                        id: data.idEvaluate,
                    },
                });

                await db.imageEvaluateProduct.destroy({
                    where: {
                        idEvaluateProduct: data.idEvaluate,
                    },
                });

                await db.videoEvaluateProduct.destroy({
                    where: {
                        idEvaluateProduct: data.idEvaluate,
                    },
                });

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updataEvaluateProduct = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.idDetailBill ||
                !data.listImage ||
                !data.star
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let evaluateProduct = await db.evaluateProduct.findOne({
                    where: {
                        idUser,
                        idDetailBill: data.idDetailBill,
                    },
                    raw: false,
                });
                if (!evaluateProduct) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Không tìm thấy hoặc bạn không được phép thực hiện tính năng này!",
                    });
                } else {
                    evaluateProduct.starNumber = data.star;
                    evaluateProduct.content = data.text;
                    evaluateProduct.displayname = data.displayname;
                    await evaluateProduct.save();

                    let imageEvaluateProduct = await db.imageEvaluateProduct.findAll({
                        where: {
                            idEvaluateProduct: evaluateProduct.id,
                            imagebase64: {
                                [Op.notIn]: data.listImage,
                            },
                        },
                    });
                    imageEvaluateProduct.forEach(async (item) => {
                        await cloudinary.v2.uploader.destroy(
                            `evaluate/${item.idCloudinary}`
                        );
                    });

                    await db.imageEvaluateProduct.destroy({
                        where: {
                            idEvaluateProduct: evaluateProduct.id,
                            imagebase64: {
                                [Op.notIn]: data.listImage,
                            },
                        },
                    });

                    resolve({
                        errCode: 0,
                        id: evaluateProduct.id,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteVideoEvaluate = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDetailBill) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let evaluateProduct = await db.evaluateProduct.findOne({
                    where: {
                        idDetailBill: data.idDetailBill,
                    },
                });

                let video = await db.videoEvaluateProduct.findOne({
                    where: {
                        idEvaluateProduct: evaluateProduct.id,
                    },
                });

                if (video) {
                    await GG_Drive.deleteFile(video.idGGDrive);
                }

                await db.videoEvaluateProduct.destroy({
                    where: {
                        idEvaluateProduct: evaluateProduct.id,
                    },
                });

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateVideoEvaluate = (id, filename) => {
    return new Promise(async (resolve, reject) => {
        try {
            let evaluateProduct = await db.evaluateProduct.findOne({
                where: {
                    idDetailBill: id,
                },
            });
            let videoOld = await db.videoEvaluateProduct.findOne({
                where: {
                    idEvaluateProduct: evaluateProduct.id,
                },
            });
            if (videoOld) {
                await GG_Drive.deleteFile(videoOld.idGGDrive);
                await db.videoEvaluateProduct.destroy({
                    where: {
                        idEvaluateProduct: evaluateProduct.id,
                    },
                });
            }

            let urlVideo = await GG_Drive.uploadFile(
                filename,
                process.env.ID_FOLDER_VIDEO_EVALUATE
            );

            await db.videoEvaluateProduct.create({
                id: uuidv4(),
                idEvaluateProduct: evaluateProduct.id,
                videobase64: urlVideo.url,
                idGGDrive: urlVideo.id,
            });

            resolve({
                errCode: 0,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const updateProfileUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.firstName) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let user = await db.User.findOne({
                    where: {
                        id: idUser,
                    },
                    raw: false,
                });

                if (!user) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy tài khoản!",
                    });
                } else {
                    if (data.firstName.length > 30 || data.lastName.length > 30) {
                        resolve({
                            errCode: 4,
                            errMessage: "Độ dài của tên vượt quá mức cho phép!",
                        });
                        return;
                    }

                    user.firstName = data.firstName;
                    user.lastName = data.lastName;
                    user.sdt = data.sdt;
                    user.gender = data.gender;
                    user.birtday = data.birtday;
                    await user.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateAvatarUser = ({ file, query, payload }) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!query.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let idUser = payload.id;
                let user = await db.User.findOne({
                    where: {
                        id: idUser,
                    },
                    raw: false,
                });

                if (!user) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy tài khoản!",
                    });
                } else {
                    if (user.avatarUpdate) {
                        let idCloudinary = user.avatarUpdate.split("/").pop().split(".")[0];
                        cloudinary.v2.uploader.destroy(`avatar_user/${idCloudinary}`);
                    }

                    user.avatarUpdate = file.path;
                    await user.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getConfirmCodeChangePass = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.passOld) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                    },
                    raw: false,
                });
                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Email không chính xác hoặc chưa được đăng kí!",
                    });
                } else {
                    let timeCurrent = new Date().getTime();
                    if (user.statusUser === "false") {
                        resolve({
                            errCode: 3,
                            errMessage: "Tài khoản đã bị khóa vĩnh viễn!",
                        });
                        return;
                    } else if (
                        user.statusUser !== "true" &&
                        +user.statusUser > timeCurrent
                    ) {
                        resolve({
                            errCode: 3,
                            errMessage: "Tài khoản đang bị tạm khóa!",
                        });
                        return;
                    }

                    if (!commont.comparePassword(data.passOld, user.pass)) {
                        resolve({
                            errCode: 3,
                            errMessage: "Mật khẩu cũ không đúng!",
                        });
                        return;
                    }

                    //gửi email
                    let rd = Math.floor(Math.random() * 900000) + 100000;
                    user.keyVerify = rd.toString();
                    await user.save();

                    commont.sendEmail(
                        data.email,
                        "Mã xác nhận TechStoreTvT",
                        `<h3>Mã xác nhận của bạn là: ${rd}</h3>
                        <div>Lưu ý: không gửi mã này cho bất kì ai.</div>
                        `
                    );

                    resolve({
                        errCode: 0,
                        // keyVerify: rd.toString()
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const confirmCodeChangePass = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.keyVerify || !data.pass) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                        keyVerify: data.keyVerify,
                    },
                    raw: false,
                });

                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Có lỗi xảy ra vui lòng thử lại sau!",
                    });
                } else {
                    if (user.typeAccount !== "web") {
                        resolve({
                            errCode: 3,
                            errMessage:
                                "Tài khoản phải là tài khoản được tạo trên website mới được phép thực hiện chức năng này!",
                        });
                        return;
                    }

                    let hasePass = commont.hashPassword(data.pass);

                    user.pass = hasePass;
                    await user.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.contentHtml ||
                !data.contentMarkdown ||
                !data.typeVideo ||
                !data.bgColor ||
                !data.editVideo ||
                !data.editImage ||
                !data.title
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let date = new Date().getTime();
                let idBlog = uuidv4();

                await db.blogs.create({
                    id: idBlog,
                    title: data.title,
                    contentHTML: data.contentHtml,
                    contentMarkdown: data.contentMarkdown,
                    idUser,
                    timeBlog: date.toString(),
                    viewBlog: 0,
                    typeBlog: "default",
                    timePost: data.timePost || 0,
                    backgroundColor: data.bgColor,
                    editVideo: data.editVideo,
                    editImage: data.editImage,
                });

                if (data.typeVideo === "iframe" && data.urlVideo) {
                    await db.videoBlogs.create({
                        id: uuidv4(),
                        idBlog: idBlog,
                        video: data.urlVideo,
                        idDrive: "",
                    });
                }

                resolve({
                    errCode: 0,
                    idBlog,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewImageBlog = ({ files, query }) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!files || files.length === 0 || !query.idBlog) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data: {
                        files,
                        query,
                    },
                });
            } else {
                let array = files.map((item, index) => {
                    return {
                        id: uuidv4(),
                        image: item.path,
                        idBlog: query.idBlog,
                        idCloudinary: item.filename,
                    };
                });

                await db.imageBlogs.bulkCreate(array, {
                    individualHooks: true,
                });
                let blog = await db.blogs.findOne({
                    where: {
                        id: query.idBlog,
                    },
                    raw: false,
                });
                if (blog) {
                    blog.editImage = "false";
                    await blog.save();
                }

                // handleEmit
                let user = await db.User.findOne({
                    include: [
                        {
                            model: db.blogs,
                            where: {
                                id: query.idBlog,
                            },
                        },
                    ],
                    raw: false,
                });

                handleEmit(`refresh-data-blog-user-${user?.id}`);

                resolve({
                    errCode: 0,
                    errMessage: "ok",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const uploadVideoNewBlog = (idBlog, fileName) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!idBlog || !fileName) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data: {
                        idBlog,
                        fileName,
                    },
                });
            } else {
                let videoBlogs = await db.videoBlogs.findOne({
                    where: {
                        idBlog: idBlog,
                    },
                    raw: false,
                });
                if (videoBlogs) {
                    if (videoBlogs.idDrive) {
                        GG_Drive.deleteFile(videoBlogs.idDrive);
                    }
                    await videoBlogs.destroy();
                }

                let urlVideo = await GG_Drive.uploadFile(
                    fileName,
                    process.env.ID_FOLDER_VIDEO_BLOG
                );

                if (urlVideo)
                    await db.videoBlogs.create({
                        id: uuidv4(),
                        idBlog: idBlog,
                        video: urlVideo.url,
                        idDrive: urlVideo.id,
                    });

                let blog = await db.blogs.findOne({
                    where: {
                        id: idBlog,
                    },
                    raw: false,
                });
                if (blog) {
                    blog.editVideo = "false";
                    await blog.save();
                }

                let user = await db.User.findOne({
                    include: [
                        {
                            model: db.blogs,
                            where: {
                                id: idBlog,
                            },
                        },
                    ],
                    raw: false,
                });

                handleEmit(`refresh-data-blog-user-${user?.id}`);

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getBlogEditById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let blog = await db.blogs.findOne({
                    where: {
                        idUser,
                        id: data.idBlog,
                        typeBlog: "default",
                    },
                    include: [
                        {
                            model: db.imageBlogs,
                        },
                        {
                            model: db.videoBlogs,
                        },
                    ],
                    raw: false,
                });

                if (!blog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy bài viết nào!",
                    });
                } else {
                    resolve({
                        errCode: 0,
                        data: blog,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.idBlog ||
                !data.contentHtml ||
                !data.contentMarkdown ||
                data.isVideo === undefined ||
                !data.typeVideo ||
                !data.bgColor ||
                !data.editVideo ||
                !data.editImage ||
                !data.title
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let blog = await db.blogs.findOne({
                    where: {
                        idUser,
                        id: data.idBlog,
                        typeBlog: "default",
                    },
                    raw: false,
                });

                if (!blog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy bài viết nào!",
                    });
                } else {
                    blog.title = data.title;
                    blog.contentHTML = data.contentHtml;
                    blog.contentMarkdown = data.contentMarkdown;
                    blog.backgroundColor = data.bgColor;
                    blog.editVideo = data.editVideo;
                    blog.editImage = data.editImage;
                    await blog.save();

                    let imageDelete = await db.imageBlogs.findAll({
                        where: {
                            idBlog: blog.id,
                            image: {
                                [Op.notIn]: data.listImage,
                            },
                        },
                    });
                    if (imageDelete) {
                        imageDelete.forEach(async (item) => {
                            cloudinary.v2.uploader.destroy(item.idCloudinary);
                        });

                        await db.imageBlogs.destroy({
                            where: {
                                idBlog: blog.id,
                                image: {
                                    [Op.notIn]: data.listImage,
                                },
                            },
                        });
                    }

                    if (!data.isVideo) {
                        let videoDelete = await db.videoBlogs.findOne({
                            where: {
                                idBlog: blog.id,
                            },
                            raw: false,
                        });
                        if (videoDelete) {
                            GG_Drive.deleteFile(videoDelete.idDrive);
                            await db.videoBlogs.destroy({
                                where: {
                                    idBlog: blog.id,
                                },
                            });
                        }
                    }
                    if (
                        data.typeVideo === "iframe" &&
                        data.urlVideo &&
                        data.urlVideo !== ""
                    ) {
                        let videoBlog = await db.videoBlogs.findOne({
                            where: {
                                idBlog: data.idBlog,
                            },
                            raw: false,
                        });
                        if (!videoBlog) {
                            await db.videoBlogs.create({
                                id: uuidv4(),
                                idBlog: data.idBlog,
                                video: data.urlVideo,
                                idDrive: "",
                            });
                        } else {
                            if (videoBlog.video !== data.urlVideo) {
                                if (videoBlog.idDrive) {
                                    GG_Drive.deleteFile(videoBlog.idDrive);
                                }
                                videoBlog.idDrive = "";
                                videoBlog.video = data.urlVideo;
                                await videoBlog.save();
                            }
                        }
                    }

                    resolve({
                        errCode: 0,
                        data: blog,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const shareProduct = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idProduct || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let blog = await db.blogs.create({
                    id: uuidv4(),
                    contentHTML: data.content,
                    idUser,
                    viewBlog: 0,
                    typeBlog: "product",
                    timePost: 0,
                });

                await db.blogShares.create({
                    id: uuidv4(),
                    idBlog: blog.id,
                    idProduct: data.idProduct,
                });
                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const shareBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let checkBlogExits = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                        typeBlog: {
                            [Op.ne]: "shareBlog",
                        },
                    },
                    raw: false,
                });
                if (!checkBlogExits) {
                    resolve({
                        errCode: 3,
                        errMessage: "Bài viết không tồn tại!",
                    });
                    return;
                }

                let blog = await db.blogs.create({
                    id: uuidv4(),
                    contentHTML: data.content,
                    idUser,
                    viewBlog: 0,
                    typeBlog: "shareBlog",
                    timePost: 0,
                });

                await db.blogShares.create({
                    id: uuidv4(),
                    idBlog: blog.id,
                    idBlogShare: data.idBlog,
                });

                checkBlogExits.amountShare = checkBlogExits.amountShare + 1;
                await checkBlogExits.save();

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const toggleLikeBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let checkBlogExits = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                    },
                    include: [
                        {
                            model: db.imageBlogs,
                        },
                    ],
                    raw: false,
                });
                if (!checkBlogExits) {
                    resolve({
                        errCode: 3,
                        errMessage: "Bài viết không tồn tại!",
                    });
                    return;
                }

                let [likeBlog, create] = await db.likeBlog.findOrCreate({
                    where: {
                        idUser,
                        idBlog: data.idBlog,
                    },
                    defaults: {
                        id: uuidv4(),
                    },
                    raw: false,
                });

                if (create) {
                    checkBlogExits.amountLike = checkBlogExits.amountLike + 1;
                    await checkBlogExits.save();

                    let user = await db.User.findOne({
                        where: {
                            id: idUser,
                        },
                    });

                    if (user.id !== checkBlogExits.idUser) {
                        let date = new Date().getTime();
                        await db.notifycations.create({
                            id: uuidv4(),
                            idUser: checkBlogExits.idUser,
                            title: `Đã có ${checkBlogExits.amountLike} lượt thích bài viết`,
                            content: `${user.firstName} ${user.lastName} đã yêu thích bài viết của bạn`,
                            timeCreate: date,
                            typeNotify: "blog",
                            urlImage: checkBlogExits.imageBlogs[0].image,
                            redirect_to: `/blogs/detail-blog/${checkBlogExits.id}`,
                        });

                        handleEmit(`new-notify-${checkBlogExits.idUser}`, {
                            title: `Có người thích bài viết của bạn`,
                            content: `${user.firstName} ${user.lastName} đã yêu thích bài viết của bạn`,
                        });
                    }

                    resolve({
                        errCode: 0,
                        errMessage: "Like",
                    });
                } else {
                    checkBlogExits.amountLike = checkBlogExits.amountLike - 1;
                    await checkBlogExits.save();
                    await likeBlog.destroy();

                    let user = await db.User.findOne({
                        where: {
                            id: idUser,
                        },
                    });

                    await db.notifycations.destroy({
                        where: {
                            idUser: checkBlogExits.idUser,
                            typeNotify: "blog",
                            content: `${user.firstName} ${user.lastName} đã yêu thích bài viết của bạn`,
                            urlImage: checkBlogExits.imageBlogs[0].image,
                        },
                    });

                    resolve({
                        errCode: 0,
                        errMessage: "unLike",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewCommentBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let checkBlogExits = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                    },
                });
                if (!checkBlogExits) {
                    resolve({
                        errCode: 3,
                        errMessage: "Bài viết không tồn tại!",
                    });
                    return;
                }

                let date = new Date().getTime();

                await db.commentBlog.create({
                    id: uuidv4(),
                    idUser,
                    content: data.content,
                    idBlog: data.idBlog,
                    timeCommentBlog: date + "",
                });

                //tang sl comment
                let blog = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                    },
                    include: [
                        {
                            model: db.imageBlogs,
                        },
                    ],
                    raw: false,
                });
                if (blog) {
                    blog.amountComment = blog.amountComment + 1;
                    await blog.save();
                }

                let user = await db.User.findOne({
                    where: {
                        id: idUser,
                    },
                });

                if (user.id !== blog.idUser) {
                    await db.notifycations.create({
                        id: uuidv4(),
                        idUser: blog.idUser,
                        title: `${user.firstName} ${user.lastName} đã bình luận bài viết`,
                        content: `${data.content}`,
                        timeCreate: date,
                        typeNotify: "blog",
                        urlImage: blog.imageBlogs[0].image,
                        redirect_to: `/blogs/detail-blog/${blog.id}`,
                    });

                    handleEmit(`new-notify-${blog.idUser}`, {
                        title: `${user.firstName} ${user.lastName} đã bình luận bài viết`,
                        content: `${data.content}`,
                    });
                }

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.content || !data.scope) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let shortVideo = await db.shortVideos.create({
                    id: uuidv4(),
                    idUser,
                    content: data.content,
                    scope: data.scope,
                    loadImage: "false",
                    loadVideo: "false",
                });

                if (data?.listHashTag?.length > 0) {
                    let arrHashTag = data?.listHashTag?.map((item) => {
                        return {
                            id: uuidv4(),
                            idShortVideo: shortVideo.id,
                            idProduct: item,
                        };
                    });
                    db.hashTagVideos.bulkCreate(arrHashTag, {
                        individualHooks: true,
                    });
                }

                resolve({
                    errCode: 0,
                    idShortVideo: shortVideo.id,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const uploadCoverImageShortVideo = ({ file, query }) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!file || !query || !query.idShortVideo) {
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: query.idShortVideo,
                    },
                    raw: false,
                });
                if (shortVideo.idCloudinary) {
                    await cloudinary.v2.uploader.destroy(shortVideo.idCloudinary);
                }
                if (shortVideo.idDriveVideo) {
                    await GG_Drive.deleteFile(shortVideo.idDriveVideo);
                }
                await shortVideo.destroy();
                await db.hashTagVideos.destroy({
                    where: {
                        idShortVideo: query?.idShortVideo || "123",
                    },
                });
                handleEmit(`refresh-short-video-user-${shortVideo?.idUser}`, {
                    status: false,
                });

                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: query.idShortVideo,
                    },
                    raw: false,
                });

                if (shortVideo.idCloudinary) {
                    cloudinary.v2.uploader.destroy(shortVideo.idCloudinary);
                }

                shortVideo.urlImage = file.path;
                shortVideo.idCloudinary = file.filename;
                shortVideo.loadImage = "true";
                await shortVideo.save();

                handleEmit(`refresh-short-video-user-${shortVideo?.idUser}`, {
                    status: true,
                });

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const uploadVideoForShortVideo = (idShortVideo, url) => {
    return new Promise(async (resolve, reject) => {
        try {
            // let urlVideo = await GG_Drive.uploadFile(
            //     url,
            //     process.env.ID_FOLDER_SHORT_VIDEO
            // );







            let shortVideo = await db.shortVideos.findOne({
                where: {
                    id: idShortVideo,
                },
                raw: false,
            });

            if (shortVideo) {
                let filepath = path.join(__dirname, `../public/videoTam/${url}`)
                // cloudinary.uploader.upload(filepath, uploadOptions, (error, result) => {
                //     if (error) {
                //         console.error(error);
                //     } else {
                //         console.log(result);
                //         console.log("Video uploaded successfully!");
                //     }
                // });
                cloudinary.v2.uploader
                    .upload(filepath,
                        {
                            resource_type: "video",
                            public_id: `short_video/${idShortVideo}-${new Date().getTime()}`,
                            eager: [
                                { width: 300, height: 300, crop: "pad", audio_codec: "none" },
                                { width: 160, height: 100, crop: "crop", gravity: "south", audio_codec: "none" }],
                            eager_async: true,
                            eager_notification_url: "https://mysite.example.com/notify_endpoint"
                        })
                    .then(async result => {
                        // console.log(result)
                        if (shortVideo.idDriveVideo) {
                            //Xoa video cũ
                            // GG_Drive.deleteFile(shortVideo.idDriveVideo);
                        }
                        shortVideo.idDriveVideo = result.url;
                        shortVideo.loadVideo = "true";
                        await shortVideo.save();

                        handleEmit(`refresh-short-video-user-${shortVideo?.idUser}`, {
                            status: true,
                        });

                        resolve({
                            errCode: 0,
                        });


                    });
            }

        } catch (e) {
            let shortVideo = await db.shortVideos.findOne({
                where: {
                    id: idShortVideo,
                },
                raw: false,
            });
            if (shortVideo.idCloudinary) {
                await cloudinary.v2.uploader.destroy(shortVideo.idCloudinary);
            }
            if (shortVideo.idDriveVideo) {
                //xóa video
                //await GG_Drive.deleteFile(shortVideo.idDriveVideo);
            }
            await shortVideo.destroy();
            await db.hashTagVideos.destroy({
                where: {
                    idShortVideo: idShortVideo || "123",
                },
            });
            handleEmit(`refresh-short-video-user-${shortVideo?.idUser}`, {
                status: false,
            });
            reject(e);
        }
    });
};

const getShortVideoById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: data.idShortVideo,
                        idUser,
                    },
                    include: [
                        {
                            model: db.hashTagVideos,
                            attributes: ["idProduct"],
                        },
                    ],
                    raw: false,
                    nest: true,
                });
                if (shortVideo) {
                    resolve({
                        errCode: 0,
                        data: shortVideo,
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy video!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateShortVideoById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.idShortVideo ||
                !data.content ||
                !data.scope
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: data.idShortVideo,
                        idUser,
                    },
                    raw: false,
                });

                if (shortVideo) {
                    shortVideo.content = data.content;
                    shortVideo.scope = data.scope;
                    shortVideo.loadImage = data?.editImage ?? "true";
                    shortVideo.loadVideo = data?.editVideo ?? "true";
                    await shortVideo.save();

                    await db.hashTagVideos.destroy({
                        where: {
                            idShortVideo: data.idShortVideo,
                        },
                    });

                    if (data?.listHashTag?.length > 0) {
                        console.log("list hash tag", data?.listHashTag);
                        let arrHashTag = data?.listHashTag?.map((item) => {
                            return {
                                id: uuidv4(),
                                idShortVideo: data.idShortVideo,
                                idProduct: item,
                            };
                        });
                        console.log("arr hash tag", arrHashTag);
                        await db.hashTagVideos.bulkCreate(arrHashTag, {
                            individualHooks: true,
                        });
                    }
                    resolve({
                        errCode: 0,
                    });
                } else {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy video!",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListBlogUserByPage = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.page) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                // let date = new Date().getTime();
                let blogs = await db.blogs.findAll({
                    where: {
                        idUser,
                    },
                    offset: (data.page - 1) * 10,
                    limit: 10,
                    attributes: {
                        exclude: ["updatedAt", "timeBlog", "idUser", "contentMarkdown"],
                    },
                    include: [
                        {
                            model: db.imageBlogs,
                            attributes: {
                                exclude: [
                                    "createdAt",
                                    "updatedAt",
                                    "stt",
                                    "idCloudinary",
                                    "idBlog",
                                    "",
                                ],
                            },
                        },
                        {
                            model: db.videoBlogs,
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "stt", "idBlog", ""],
                            },
                        },
                        {
                            model: db.User,
                            attributes: {
                                exclude: [
                                    "updatedAt",
                                    "statusUser",
                                    "sdt",
                                    "pass",
                                    "keyVerify",
                                    "idGoogle",
                                    "idGithub",
                                    "idFacebook",
                                    "id",
                                    "email",
                                    "createdAt",
                                    "birtday",
                                    "gender",
                                ],
                            },
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                        {
                            model: db.blogShares,
                            as: "blogs-blogShares-parent",
                            attributes: {
                                exclude: [
                                    "createdAt",
                                    "updatedAt",
                                    "stt",
                                    "idBlogShare",
                                    "idProduct",
                                    "idBlog",
                                ],
                            },
                            include: [
                                {
                                    model: db.product,
                                    attributes: {
                                        exclude: [
                                            "createdAt",
                                            "updatedAt",
                                            "stt",
                                            "sold",
                                            "priceProduct",
                                            "nameProductEn",
                                            "isSell",
                                            "idTypeProduct",
                                            "idTrademark",
                                            "contentMarkdown",
                                            "contentHTML",
                                        ],
                                    },
                                    include: [
                                        {
                                            model: db.imageProduct,
                                            as: "imageProduct-product",
                                        },
                                    ],
                                },
                                {
                                    model: db.blogs,
                                    as: "blogs-blogShares-child",
                                    attributes: {
                                        exclude: [
                                            "createdAt",
                                            "updatedAt",
                                            "stt",
                                            "viewBlog",
                                            "timePost",
                                            "timeBlog",
                                            "idUser",
                                            "contentMarkdown",
                                        ],
                                    },
                                },
                            ],
                        },
                        // {
                        //    model: db.likeBlog,
                        //    attributes: ['id'],
                        // },
                        // {
                        //    model: db.blogShares, as: 'listBlogShare',
                        //    attributes: ['id']
                        // },
                        // {
                        //    model: db.commentBlog,
                        //    attributes: ['id']
                        // }
                    ],
                    order: [["stt", "DESC"]],
                    raw: false,
                    nest: true,
                });

                let count = await db.blogs.count({
                    where: {
                        idUser,
                    },
                    include: [
                        {
                            model: db.User,
                            attributes: {
                                exclude: [
                                    "updatedAt",
                                    "statusUser",
                                    "sdt",
                                    "pass",
                                    "keyVerify",
                                    "idGoogle",
                                    "idGithub",
                                    "idFacebook",
                                    "id",
                                    "email",
                                    "createdAt",
                                    "birtday",
                                    "gender",
                                ],
                            },
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: blogs,
                    count,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteBlogUserById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let blog = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                        idUser,
                    },
                    include: [
                        {
                            model: db.blogShares,
                            as: "blogs-blogShares-parent",
                        },
                    ],
                    raw: false,
                    nest: true,
                });
                if (!blog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Bài viết không tồn tại!",
                    });
                } else {
                    await db.blogShares.destroy({
                        where: {
                            idBlog: blog.id,
                        },
                    });
                    let videoBlog = await db.videoBlogs.findOne({
                        where: {
                            idBlog: blog.id,
                        },
                        raw: false,
                    });
                    if (videoBlog) {
                        if (videoBlog.idDrive !== "")
                            GG_Drive.deleteFile(videoBlog.idDrive);
                        await videoBlog.destroy();
                    }
                    let imageBlogs = await db.imageBlogs.findAll({
                        where: {
                            idBlog: blog.id,
                        },
                    });
                    if (imageBlogs && imageBlogs.length > 0) {
                        imageBlogs.map((item) => {
                            cloudinary.v2.uploader.destroy(item.idCloudinary);
                        });
                    }
                    await db.imageBlogs.destroy({
                        where: {
                            idBlog: blog.id,
                        },
                    });

                    //xoa amount share
                    if (blog.typeBlog === "shareBlog") {
                        if (data.idBlogShare) {
                            let blogShare = await db.blogs.findOne({
                                where: {
                                    id: data.idBlogShare,
                                },
                                raw: false,
                            });

                            if (blogShare) {
                                console.log("tim thay");
                                blogShare.amountShare = blogShare.amountShare - 1;
                                await blogShare.save();
                            } else {
                                console.log("khong tim thay");
                            }
                        }
                    }

                    await blog.destroy();
                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const editContentBlogUserById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let blog = await db.blogs.findOne({
                    where: {
                        idUser,
                        id: data.idBlog,
                    },
                    raw: false,
                });
                if (!blog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Bài viết không tồn tại!",
                    });
                } else {
                    blog.contentHTML = data.content;
                    await blog.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteCommentBlogById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idComment) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let commentBlog = await db.commentBlog.findOne({
                    where: {
                        id: data.idComment,
                        idUser,
                    },
                    include: [
                        {
                            model: db.User,
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                if (!commentBlog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Hiện không thể thực hiện tính năng này!",
                    });
                    return;
                } else {
                    await commentBlog.destroy();

                    let blog = await db.blogs.findOne({
                        where: {
                            id: commentBlog.idBlog,
                        },
                        raw: false,
                    });
                    if (blog) {
                        blog.amountComment = blog.amountComment - 1;
                        await blog.save();
                    }

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateCommentBlogById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idComment || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let commentBlog = await db.commentBlog.findOne({
                    where: {
                        id: data.idComment,
                        idUser,
                    },
                    include: [
                        {
                            model: db.User,
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                if (!commentBlog) {
                    resolve({
                        errCode: 3,
                        errMessage: "Hiện không thể thực hiện tính năng này!",
                    });
                    return;
                } else {
                    commentBlog.content = data.content;
                    await commentBlog.save();
                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListBlogByIdUser = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idUser || !data.page) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = data.idUser;
                let date = new Date().getTime();
                let blogs = await db.blogs.findAll({
                    where: {
                        idUser,
                        timePost: {
                            [Op.lt]: date,
                        },
                    },
                    offset: (data.page - 1) * 10,
                    limit: 10,
                    attributes: {
                        exclude: [
                            "updatedAt",
                            "timePost",
                            "timeBlog",
                            "idUser",
                            "contentMarkdown",
                        ],
                    },
                    include: [
                        {
                            model: db.imageBlogs,
                            attributes: {
                                exclude: [
                                    "createdAt",
                                    "updatedAt",
                                    "stt",
                                    "idCloudinary",
                                    "idBlog",
                                    "",
                                ],
                            },
                        },
                        {
                            model: db.videoBlogs,
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "stt", "idBlog", ""],
                            },
                        },
                        {
                            model: db.User,
                            attributes: {
                                exclude: [
                                    "updatedAt",
                                    "statusUser",
                                    "sdt",
                                    "pass",
                                    "keyVerify",
                                    "idGoogle",
                                    "idGithub",
                                    "idFacebook",
                                    "id",
                                    "email",
                                    "createdAt",
                                    "birtday",
                                    "gender",
                                ],
                            },
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                        {
                            model: db.blogShares,
                            as: "blogs-blogShares-parent",
                            attributes: {
                                exclude: [
                                    "createdAt",
                                    "updatedAt",
                                    "stt",
                                    "idBlogShare",
                                    "idProduct",
                                    "idBlog",
                                ],
                            },
                            include: [
                                {
                                    model: db.product,
                                    attributes: {
                                        exclude: [
                                            "createdAt",
                                            "updatedAt",
                                            "stt",
                                            "sold",
                                            "priceProduct",
                                            "nameProductEn",
                                            "isSell",
                                            "idTypeProduct",
                                            "idTrademark",
                                            "contentMarkdown",
                                            "contentHTML",
                                        ],
                                    },
                                    include: [
                                        {
                                            model: db.imageProduct,
                                            as: "imageProduct-product",
                                        },
                                    ],
                                },
                                {
                                    model: db.blogs,
                                    as: "blogs-blogShares-child",
                                    attributes: {
                                        exclude: [
                                            "createdAt",
                                            "updatedAt",
                                            "stt",
                                            "viewBlog",
                                            "timePost",
                                            "timeBlog",
                                            "idUser",
                                            "contentMarkdown",
                                        ],
                                    },
                                },
                            ],
                        },
                        {
                            model: db.likeBlog,
                            attributes: ["id"],
                        },
                        {
                            model: db.blogShares,
                            as: "listBlogShare",
                            attributes: ["id"],
                        },
                        {
                            model: db.commentBlog,
                            attributes: ["id"],
                        },
                    ],
                    order: [["stt", "DESC"]],
                    raw: false,
                    nest: true,
                });

                let count = await db.blogs.count({
                    where: {
                        idUser,
                    },
                    include: [
                        {
                            model: db.User,
                            attributes: {
                                exclude: [
                                    "updatedAt",
                                    "statusUser",
                                    "sdt",
                                    "pass",
                                    "keyVerify",
                                    "idGoogle",
                                    "idGithub",
                                    "idFacebook",
                                    "id",
                                    "email",
                                    "createdAt",
                                    "birtday",
                                    "gender",
                                ],
                            },
                            where: {
                                statusUser: {
                                    [Op.ne]: "false",
                                },
                            },
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: blogs,
                    count,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const saveBlogCollection = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let checkBlog = await db.blogs.findOne({
                    where: {
                        id: data.idBlog,
                    },
                });

                if (!checkBlog) {
                    resolve({
                        errCode: 2,
                        errMessage: "Không tìm thấy bài viết!",
                    });
                    return;
                }

                let [collection, create] = await db.collectionBlogs.findOrCreate({
                    where: {
                        idBlog: data.idBlog,
                        idUser,
                    },
                    defaults: {
                        id: uuidv4(),
                    },
                    raw: false,
                });

                if (!create) {
                    await collection.destroy();
                    resolve({
                        errCode: 0,
                    });
                    return;
                }
                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListCollectionBlogUserByPage = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.page) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let collections = await db.collectionBlogs.findAll({
                    where: {
                        idUser,
                    },
                    limit: 20,
                    offset: (data.page - 1) * 20,
                    attributes: ["id", "createdAt"],
                    include: [
                        {
                            model: db.blogs,
                            attributes: ["contentHTML", "backgroundColor", "id"],
                            include: [
                                {
                                    model: db.User,
                                    attributes: ["firstName", "lastName"],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                    raw: false,
                });

                let count = await db.collectionBlogs.count({
                    where: {
                        idUser,
                    },
                    include: [
                        {
                            model: db.blogs,
                            include: [
                                {
                                    model: db.User,
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                    raw: false,
                });

                resolve({
                    errCode: 0,
                    data: collections,
                    count,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteCollectBlogById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idCollect) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                await db.collectionBlogs.destroy({
                    where: {
                        id: data.idCollect,
                    },
                });

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createCommentShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: data.idShortVideo,
                    },
                    raw: false,
                });
                if (!shortVideo) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy video nào!",
                    });
                    return;
                }

                let idCmt = uuidv4();
                await db.commentShortVideos.create({
                    id: idCmt,
                    idUser: payload.id,
                    idShortVideo: data.idShortVideo,
                    content: data.content,
                });

                shortVideo.countComment = shortVideo.countComment + 1;
                await shortVideo.save();

                let user = await db.User.findOne({
                    where: {
                        id: payload.id,
                    },
                });
                //notify
                if (user.id !== shortVideo.idUser) {
                    let date = new Date().getTime();
                    await db.notifycations.create({
                        id: uuidv4(),
                        idUser: shortVideo.idUser,
                        title: "Bình luận mới trong video của bạn",
                        content: `${user.firstName} ${user.lastName} đã để lại bình luận: ${data.content}`,
                        timeCreate: date,
                        typeNotify: "short_video",
                        urlImage: shortVideo.urlImage,
                        redirect_to: `/short-video/foryou?_isv=${shortVideo.id}`,
                    });

                    handleEmit(`new-notify-${shortVideo.idUser}`, {
                        title: `${user.firstName} ${user.lastName} đã bình luận video của bạn`,
                        content: `${data.content}`,
                    });
                }

                resolve({
                    errCode: 0,
                    idCmt: idCmt,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteCommentShortVideoById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idCommemtShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let commentShortVideos = await db.commentShortVideos.findOne({
                    where: {
                        id: data.idCommemtShortVideo,
                        idUser: payload.id,
                    },
                    raw: false,
                });
                if (!commentShortVideos) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Không tìm thấy hoặc bạn không được phép thực hiện chức năng này!",
                    });
                    return;
                }

                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: commentShortVideos.idShortVideo,
                    },
                    raw: false,
                });

                if (shortVideo) {
                    shortVideo.countComment = shortVideo.countComment - 1;
                    await shortVideo.save();
                }

                await commentShortVideos.destroy();

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const editCommentShortVideoById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                !data.accessToken ||
                !data.idCommemtShortVideo ||
                !data.content ||
                !data.idShortVideo
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let commentShortVideos = await db.commentShortVideos.findOne({
                    where: {
                        id: data.idCommemtShortVideo,
                        idUser,
                        idShortVideo: data.idShortVideo,
                    },
                    raw: false,
                });
                if (!commentShortVideos) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Không tìm thấy hoặc bạn không được phép thực hiện chức năng này!",
                    });
                    return;
                }

                commentShortVideos.content = data.content;
                await commentShortVideos.save();

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const toggleLikeShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: data.idShortVideo,
                    },
                    raw: false,
                });

                if (!shortVideo) {
                    resolve({
                        errCode: 3,
                        errMessage:
                            "Không tìm thấy hoặc bạn không được phép thực hiện chức năng này!",
                    });
                    return;
                }

                let [likeShortVideo, create] = await db.likeShortVideos.findOrCreate({
                    where: {
                        idUser,
                        idShortVideo: shortVideo.id,
                    },
                    defaults: {
                        id: uuidv4(),
                    },
                });

                if (create) {
                    shortVideo.countLike = shortVideo.countLike + 1;
                    await shortVideo.save();

                    let user = await db.User.findOne({
                        where: {
                            id: idUser,
                        },
                    });

                    if (user.id !== shortVideo.idUser) {
                        let date = new Date().getTime();
                        await db.notifycations.create({
                            id: uuidv4(),
                            idUser: shortVideo.idUser,
                            title: "Lượt yêu thích video ngắn mới",
                            content: `${user.firstName} ${user.lastName} đã thích 1 video của bạn`,
                            timeCreate: date,
                            typeNotify: "short_video",
                            urlImage: shortVideo.urlImage,
                            redirect_to: `/short-video/foryou?_isv=${shortVideo.id}`,
                        });

                        handleEmit(`new-notify-${shortVideo.idUser}`, {
                            title: "Lượt yêu thích video ngắn mới",
                            content: `${user.firstName} ${user.lastName} đã thích 1 video của bạn`,
                        });
                    }

                    resolve({
                        errCode: 0,
                        mess: "add",
                    });
                } else {
                    shortVideo.countLike = shortVideo.countLike - 1;
                    await shortVideo.save();

                    await db.likeShortVideos.destroy({
                        where: {
                            idUser,
                            idShortVideo: shortVideo.id,
                        },
                    });

                    let user = await db.User.findOne({
                        where: {
                            id: idUser,
                        },
                    });

                    await db.notifycations.destroy({
                        where: {
                            idUser: shortVideo.idUser,
                            title: "Lượt yêu thích video ngắn mới",
                            typeNotify: "short_video",
                            content: `${user.firstName} ${user.lastName} đã thích 1 video của bạn`,
                            urlImage: shortVideo.urlImage,
                        },
                    });

                    resolve({
                        errCode: 0,
                        mess: "remove",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const checkUserLikeShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let likeShortVideo = await db.likeShortVideos.findOne({
                    where: {
                        idUser,
                        idShortVideo: data.idShortVideo,
                    },
                });

                if (likeShortVideo) {
                    resolve({
                        errCode: 0,
                        mess: true,
                    });
                } else {
                    resolve({
                        errCode: 0,
                        mess: false,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const saveCollectionShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let [collectionShortVideo, create] =
                    await db.collectionShortVideos.findOrCreate({
                        where: {
                            idUser,
                            idShortVideo: data.idShortVideo,
                        },
                        defaults: {
                            id: uuidv4(),
                        },
                        raw: false,
                    });

                if (create) {
                    resolve({
                        errCode: 0,
                        mess: "add",
                    });
                } else {
                    await collectionShortVideo.destroy();
                    resolve({
                        errCode: 0,
                        mess: "remove",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const CheckSaveCollectionShortVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let collectionShortVideo = await db.collectionShortVideos.findOne({
                    where: {
                        idUser,
                        idShortVideo: data.idShortVideo,
                    },
                });

                if (collectionShortVideo) {
                    resolve({
                        errCode: 0,
                        mess: true,
                    });
                } else {
                    resolve({
                        errCode: 0,
                        mess: false,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListVideoByIdUser = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                (!data.idUser && !data.accessToken) ||
                !data.page ||
                !data.ft ||
                !data.nav
            ) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = "";
                if (data.idUser && !data.accessToken) idUser = data.idUser;
                else {
                    let decoded = commont.decodeToken(
                        data.accessToken,
                        process.env.ACCESS_TOKEN_SECRET
                    );
                    if (decoded === null) {
                        resolve({
                            errCode: 2,
                            errMessage: "Đăng nhập đã hết hạn!",
                        });
                        return;
                    }
                    idUser = decoded.id;
                }

                let count = await db.shortVideos.count({
                    where: {
                        idUser,
                    },
                });

                let countLike = await db.shortVideos.sum("countLike");

                if (data.idUser) {
                    if (data.nav === "video") {
                        let listVideo = await db.shortVideos.findAll({
                            where: {
                                idUser,
                                scope: "public",
                            },

                            attributes: [
                                "id",
                                "idDriveVideo",
                                "urlImage",
                                "content",
                                "scope",
                                "countLike",
                                "countComment",
                                "stt",
                                "loadImage",
                                "loadVideo",
                            ],
                            include: [
                                {
                                    model: db.hashTagVideos,
                                    attributes: ["id"],
                                    include: [
                                        {
                                            model: db.product,
                                            attributes: ["id", "nameProduct"],
                                        },
                                    ],
                                },
                                {
                                    model: db.User,
                                    attributes: [
                                        "id",
                                        "firstName",
                                        "lastName",
                                        "idTypeUser",
                                        "typeAccount",
                                        "avatar",
                                        "avatarGoogle",
                                        "avatarFacebook",
                                        "avatarGithub",
                                        "avatarUpdate",
                                        "statusUser",
                                    ],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                            ],
                            raw: false,
                            nest: true,
                            offset: (data.page * 1 - 1) * 50,
                            limit: 50,
                            order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                        });

                        resolve({
                            errCode: 0,
                            data: listVideo,
                            countPage: count,
                            countLike,
                        });
                    } else if (data.nav === "save") {
                        let count = await db.shortVideos.count({
                            include: [
                                {
                                    model: db.User,
                                    attributes: [
                                        "id",
                                        "firstName",
                                        "lastName",
                                        "idTypeUser",
                                        "typeAccount",
                                        "avatar",
                                        "avatarGoogle",
                                        "avatarFacebook",
                                        "avatarGithub",
                                        "avatarUpdate",
                                        "statusUser",
                                    ],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                                {
                                    model: db.collectionShortVideos,
                                    where: {
                                        idUser,
                                    },
                                    attributes: ["id"],
                                },
                            ],
                            raw: false,
                            nest: true,
                        });

                        let listVideo = await db.shortVideos.findAll({
                            where: {
                                scope: "public",
                            },

                            attributes: [
                                "id",
                                "idDriveVideo",
                                "urlImage",
                                "content",
                                "scope",
                                "countLike",
                                "countComment",
                                "stt",
                                "loadImage",
                                "loadVideo",
                            ],
                            include: [
                                {
                                    model: db.hashTagVideos,
                                    attributes: ["id"],
                                    include: [
                                        {
                                            model: db.product,
                                            attributes: ["id", "nameProduct"],
                                        },
                                    ],
                                },
                                {
                                    model: db.User,
                                    attributes: [
                                        "id",
                                        "firstName",
                                        "lastName",
                                        "idTypeUser",
                                        "typeAccount",
                                        "avatar",
                                        "avatarGoogle",
                                        "avatarFacebook",
                                        "avatarGithub",
                                        "avatarUpdate",
                                        "statusUser",
                                    ],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                                {
                                    model: db.collectionShortVideos,
                                    where: {
                                        idUser,
                                    },
                                    attributes: ["id"],
                                },
                            ],
                            raw: false,
                            nest: true,
                            offset: (data.page * 1 - 1) * 50,
                            limit: 50,
                            order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                        });

                        resolve({
                            errCode: 0,
                            data: listVideo,
                            countPage: count,
                            countLike,
                        });
                    } else if (data.nav === "like") {
                        let count = await db.shortVideos.count({
                            include: [
                                {
                                    model: db.User,
                                    attributes: [
                                        "id",
                                        "firstName",
                                        "lastName",
                                        "idTypeUser",
                                        "typeAccount",
                                        "avatar",
                                        "avatarGoogle",
                                        "avatarFacebook",
                                        "avatarGithub",
                                        "avatarUpdate",
                                        "statusUser",
                                    ],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                                {
                                    model: db.likeShortVideos,
                                    where: {
                                        idUser,
                                    },
                                    // attributes: ['id']
                                },
                            ],
                            raw: false,
                            nest: true,
                        });
                        let listVideo = await db.shortVideos.findAll({
                            where: {
                                scope: "public",
                            },

                            attributes: [
                                "id",
                                "idDriveVideo",
                                "urlImage",
                                "content",
                                "scope",
                                "countLike",
                                "countComment",
                                "stt",
                                "loadImage",
                                "loadVideo",
                            ],
                            include: [
                                {
                                    model: db.hashTagVideos,
                                    attributes: ["id"],
                                    include: [
                                        {
                                            model: db.product,
                                            attributes: ["id", "nameProduct"],
                                        },
                                    ],
                                },
                                {
                                    model: db.User,
                                    attributes: [
                                        "id",
                                        "firstName",
                                        "lastName",
                                        "idTypeUser",
                                        "typeAccount",
                                        "avatar",
                                        "avatarGoogle",
                                        "avatarFacebook",
                                        "avatarGithub",
                                        "avatarUpdate",
                                        "statusUser",
                                    ],
                                    where: {
                                        statusUser: {
                                            [Op.ne]: "false",
                                        },
                                    },
                                },
                                {
                                    model: db.likeShortVideos,
                                    where: {
                                        idUser,
                                    },
                                    attributes: ["id"],
                                },
                            ],
                            raw: false,
                            nest: true,
                            offset: (data.page * 1 - 1) * 50,
                            limit: 50,
                            order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                        });

                        resolve({
                            errCode: 0,
                            data: listVideo,
                            countPage: count,
                            countLike,
                        });
                    }

                    return;
                }

                if (data.nav === "video") {
                    let listVideo = await db.shortVideos.findAll({
                        where: {
                            idUser,
                        },

                        attributes: [
                            "id",
                            "idDriveVideo",
                            "urlImage",
                            "content",
                            "scope",
                            "countLike",
                            "countComment",
                            "stt",
                            "loadImage",
                            "loadVideo",
                        ],
                        include: [
                            {
                                model: db.hashTagVideos,
                                attributes: ["id"],
                                include: [
                                    {
                                        model: db.product,
                                        attributes: ["id", "nameProduct"],
                                    },
                                ],
                            },
                            {
                                model: db.User,
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "idTypeUser",
                                    "typeAccount",
                                    "avatar",
                                    "avatarGoogle",
                                    "avatarFacebook",
                                    "avatarGithub",
                                    "avatarUpdate",
                                    "statusUser",
                                ],
                                where: {
                                    statusUser: {
                                        [Op.ne]: "false",
                                    },
                                },
                            },
                        ],
                        raw: false,
                        nest: true,
                        offset: (data.page * 1 - 1) * 50,
                        limit: 50,
                        order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                    });

                    resolve({
                        errCode: 0,
                        data: listVideo,
                        countPage: count,
                        countLike,
                    });
                } else if (data.nav === "save") {
                    let count = await db.shortVideos.count({
                        include: [
                            {
                                model: db.User,
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "idTypeUser",
                                    "typeAccount",
                                    "avatar",
                                    "avatarGoogle",
                                    "avatarFacebook",
                                    "avatarGithub",
                                    "avatarUpdate",
                                    "statusUser",
                                ],
                                where: {
                                    statusUser: {
                                        [Op.ne]: "false",
                                    },
                                },
                            },
                            {
                                model: db.collectionShortVideos,
                                where: {
                                    idUser,
                                },
                                attributes: ["id"],
                            },
                        ],
                        raw: false,
                        nest: true,
                    });

                    let listVideo = await db.shortVideos.findAll({
                        // where: {
                        //    idUser,
                        // },

                        attributes: [
                            "id",
                            "idDriveVideo",
                            "urlImage",
                            "content",
                            "scope",
                            "countLike",
                            "countComment",
                            "stt",
                            "loadImage",
                            "loadVideo",
                        ],
                        include: [
                            {
                                model: db.hashTagVideos,
                                attributes: ["id"],
                                include: [
                                    {
                                        model: db.product,
                                        attributes: ["id", "nameProduct"],
                                    },
                                ],
                            },
                            {
                                model: db.User,
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "idTypeUser",
                                    "typeAccount",
                                    "avatar",
                                    "avatarGoogle",
                                    "avatarFacebook",
                                    "avatarGithub",
                                    "avatarUpdate",
                                    "statusUser",
                                ],
                                where: {
                                    statusUser: {
                                        [Op.ne]: "false",
                                    },
                                },
                            },
                            {
                                model: db.collectionShortVideos,
                                where: {
                                    idUser,
                                },
                                attributes: ["id"],
                            },
                        ],
                        raw: false,
                        nest: true,
                        offset: (data.page * 1 - 1) * 50,
                        limit: 50,
                        order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                    });

                    resolve({
                        errCode: 0,
                        data: listVideo,
                        countPage: count,
                        countLike,
                    });
                } else if (data.nav === "like") {
                    let count = await db.shortVideos.count({
                        include: [
                            {
                                model: db.User,
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "idTypeUser",
                                    "typeAccount",
                                    "avatar",
                                    "avatarGoogle",
                                    "avatarFacebook",
                                    "avatarGithub",
                                    "avatarUpdate",
                                    "statusUser",
                                ],
                                where: {
                                    statusUser: {
                                        [Op.ne]: "false",
                                    },
                                },
                            },
                            {
                                model: db.likeShortVideos,
                                where: {
                                    idUser,
                                },
                                // attributes: ['id']
                            },
                        ],
                        raw: false,
                        nest: true,
                    });
                    let listVideo = await db.shortVideos.findAll({
                        attributes: [
                            "id",
                            "idDriveVideo",
                            "urlImage",
                            "content",
                            "scope",
                            "countLike",
                            "countComment",
                            "stt",
                            "loadImage",
                            "loadVideo",
                        ],
                        include: [
                            {
                                model: db.hashTagVideos,
                                attributes: ["id"],
                                include: [
                                    {
                                        model: db.product,
                                        attributes: ["id", "nameProduct"],
                                    },
                                ],
                            },
                            {
                                model: db.User,
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "idTypeUser",
                                    "typeAccount",
                                    "avatar",
                                    "avatarGoogle",
                                    "avatarFacebook",
                                    "avatarGithub",
                                    "avatarUpdate",
                                    "statusUser",
                                ],
                                where: {
                                    statusUser: {
                                        [Op.ne]: "false",
                                    },
                                },
                            },
                            {
                                model: db.likeShortVideos,
                                where: {
                                    idUser,
                                },
                                attributes: ["id"],
                            },
                        ],
                        raw: false,
                        nest: true,
                        offset: (data.page * 1 - 1) * 50,
                        limit: 50,
                        order: [["stt", data.ft === "old" ? "ASC" : "DESC"]],
                    });

                    resolve({
                        errCode: 0,
                        data: listVideo,
                        countPage: count,
                        countLike,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getUserById = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idUser) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        id: data.idUser,
                    },
                });

                if (user) {
                    resolve({
                        errCode: 0,
                        data: user,
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "Not found user",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const deleteShortVideoById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let shortVideo = await db.shortVideos.findOne({
                    where: {
                        id: data.idShortVideo,
                        idUser,
                    },
                    raw: false,
                });
                if (!shortVideo) {
                    resolve({
                        errCode: 3,
                        errMessage: "Không tìm thấy video nào!",
                    });
                    return;
                }

                // GG_Drive.deleteFile(shortVideo.idDriveVideo); // xoa video
                cloudinary.v2.uploader.destroy(shortVideo.idCloudinary);

                await shortVideo.destroy();
                console.log("xoa shortVideo");
                await db.hashTagVideos.destroy({
                    where: {
                        idShortVideo: data.idShortVideo,
                    },
                });
                console.log("xoa hashTagVideos");
                await db.commentShortVideos.destroy({
                    where: {
                        idShortVideo: data.idShortVideo,
                    },
                });
                console.log("xoa commentShortVideos");
                await db.likeShortVideos.destroy({
                    where: {
                        idShortVideo: data.idShortVideo,
                    },
                });
                console.log("xoa likeShortVideos");
                await db.collectionShortVideos.destroy({
                    where: {
                        idShortVideo: data.idShortVideo,
                    },
                });
                console.log("xoa collectionShortVideos");

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const checkLikeBlogById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBlog || !data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let check = await db.likeBlog.count({
                    where: {
                        idUser,
                        idBlog: data.idBlog,
                    },
                });

                resolve({
                    errCode: 0,
                    data: check === 0 ? false : true,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const checkSaveBlogById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBlog || !data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;
                let check = await db.collectionBlogs.count({
                    where: {
                        idUser,
                        idBlog: data.idBlog,
                    },
                });

                resolve({
                    errCode: 0,
                    data: check === 0 ? false : true,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const testHeaderLogin = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
        } catch (e) {
            reject(e);
        }
    });
};

const getListNotifyAll = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let date = new Date().getTime() - 259200000;
                let rows = await db.notifycations.findAll({
                    where: {
                        idUser,
                        timeCreate: {
                            [Op.gt]: date,
                        },
                    },
                    limit: 10,
                    order: [["timeCreate", "DESC"]],
                    raw: true,
                });

                let count = rows.reduce((n, item) => {
                    if (item.seen === "false") return n + 1;
                    return n;
                }, 0);
                resolve({
                    errCode: 0,
                    data: rows,
                    count,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListNotifyByType = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.type || !data.page) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                let date = new Date().getTime() - 604800000;
                let rows = await db.notifycations.findAll({
                    where: {
                        idUser,
                        timeCreate: {
                            [Op.gt]: date,
                        },
                        typeNotify: data.type,
                    },
                    limit: 20,
                    offset: (data.page - 1) * 20,
                    order: [["timeCreate", "DESC"]],
                });

                let count = await db.notifycations.count({
                    where: {
                        idUser,
                        timeCreate: {
                            [Op.gt]: date,
                        },
                        typeNotify: data.type,
                    },
                });

                resolve({
                    errCode: 0,
                    data: rows,
                    count,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const seenNotifyOfUser = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let idUser = payload.id;

                await db.notifycations.update(
                    { seen: "true" },
                    {
                        where: {
                            seen: "false",
                            idUser,
                        },
                    }
                );

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const sendEmailFromContact = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.name || !data.email || !data.sdt || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                commont.sendEmail(
                    "ngoantung2565@gmail.com",
                    data.name + " đã gửi tin nhắn từ TechStoreTvT",
                    "Nội dụng tin nhắn từ (" +
                    data.email +
                    " - " +
                    data.sdt +
                    "): " +
                    data.content
                );

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewReportVideo = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idShortVideo || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                await db.reportVideos.create({
                    id: uuidv4(),
                    idShortVideo: data.idShortVideo,
                    idUser: payload.id,
                    content: data.content,
                    status: "true",
                });
                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewReportBlog = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.accessToken || !data.idBlog || !data.content) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                await db.reportBlogs.create({
                    id: uuidv4(),
                    idBlog: data.idBlog,
                    idUser: payload.id,
                    content: data.content,
                    status: "true",
                });
                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getBillById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBill) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let bill = await db.bill.findOne({
                    where: {
                        idUser: payload.id,
                        id: data.idBill,
                    },
                    include: [
                        {
                            model: db.detailBill,
                            include: [
                                {
                                    model: db.product,
                                    include: [
                                        {
                                            model: db.imageProduct,
                                            as: "imageProduct-product",
                                        },
                                        { model: db.promotionProduct },
                                    ],
                                },
                                {
                                    model: db.classifyProduct,
                                },
                            ],
                        },
                        {
                            model: db.statusBills,
                            attributes: {
                                exclude: ["createdAt", "updatedAt"],
                            },
                        },
                        {
                            model: db.addressUser,
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: bill,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const getDetailBillById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDetailBill) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let detailBill = await db.detailBill.findOne({
                    where: {
                        id: data.idDetailBill,
                    },
                    include: [
                        {
                            model: db.product,
                            include: [
                                {
                                    model: db.imageProduct,
                                    as: "imageProduct-product",
                                },
                                { model: db.promotionProduct },
                            ],
                        },
                        {
                            model: db.classifyProduct,
                        },
                        {
                            model: db.evaluateProduct,
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: detailBill,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const createNewUserMobile = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.firstName || !data.lastName || !data.email || !data.password) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {

                verifier_email.verify(
                    data.email,
                    { hardRefresh: true },
                    async (err, res) => {
                        if (err) {
                            throw err;
                        }
                        if (res.smtpCheck === "false") {
                            resolve({
                                errCode: 3,
                                errMessage:
                                    "Email này không tồn tại, vui lòng kiểm tra lỗi chính tả!",
                            });
                            return;
                        } else {
                            let passHash = commont.hashPassword(data.password);
                            let keyCode = Math.floor(Math.random() * 999999 + 100000);
                            let [user, created] = await db.User.findOrCreate({
                                where: { email: data.email },
                                defaults: {
                                    firstName: data.firstName,
                                    lastName: data.lastName,
                                    pass: passHash,
                                    idTypeUser: "3",
                                    keyVerify: keyCode.toString(),
                                    statusUser: "wait",
                                    typeAccount: "web",
                                    id: uuidv4(),
                                    gender: "nam",
                                    birtday: "1/1/1990",
                                },
                                raw: false,
                            });

                            if (!created) {
                                //Tài khoản đã tồn tại
                                if (user.statusUser === "true") {
                                    resolve({
                                        errCode: 2,
                                        errMessage: "Tài khoản này đã tồn tại!",
                                    });
                                }
                                //Tài khoản chưa được xác nhận
                                else if (user.statusUser === "wait") {
                                    //update data
                                    user.firstName = data.firstName;
                                    user.lastName = data.lastName;
                                    user.pass = passHash;
                                    user.keyVerify = keyCode;
                                    await user.save();

                                    //send email
                                    let title = "Xác nhận tạo tài khoản TechStoreTvT";
                                    let contentHtml = `<h2>Mã xác nhận của bạn là: ${keyCode}</h3>`;

                                    commont.sendEmail(user.email, title, contentHtml);

                                    resolve({
                                        errCode: 0,
                                        errMessage: "Tài khoản chưa được xác nhận",
                                    });
                                }
                            } else {
                                //send email
                                let title = "Xác nhận tạo tài khoản TechStoreTvT";
                                let contentHtml = `<h2>Mã xác nhận của bạn là: ${keyCode}</h3>`;

                                commont.sendEmail(user.email, title, contentHtml);

                                resolve({
                                    errCode: 0,
                                    errMessage: "Đã tạo tài khoản",
                                });
                            }
                        }
                    }
                );



            }
        } catch (e) {
            reject(e);
        }
    });
};

const verifyCodeForCreateUserMobile = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.code) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                });
            } else {
                let user = await db.User.findOne({
                    where: {
                        email: data.email,
                        // keyVerify: data.code,
                    },
                    raw: false,
                });

                if (!user) {
                    resolve({
                        errCode: 2,
                        errMessage: "Not found user",
                    });
                } else {
                    if (user.keyVerify !== data.code) {
                        return resolve({
                            errCode: 3,
                            errMessage: "Mã xác nhận không đúng",
                        });
                    }

                    user.statusUser = "true";
                    await user.save();

                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const themDanhSachPhat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tenDanhSach) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let [row, created] = await db.danhSachPhat.findOrCreate({
                    where: {
                        tenDanhSach: data.tenDanhSach,
                        idUser: payload.id,
                    },
                    defaults: {
                        id: uuidv4(),
                    },
                });

                if (created) {
                    resolve({
                        errCode: 0,
                        data: row,
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "Tên danh sách đã tồn tại",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const layDanhSachPhat = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let danhSach = await db.danhSachPhat.findAll({
                where: {
                    idUser: payload.id,
                },
                include: [
                    {
                        model: db.chiTietDanhSachPhat,
                        attributes: ["id"],
                        include: [
                            {
                                model: db.baihat,
                                attributes: ["id", "anhBia"],
                            },
                        ],
                    },
                ],
                raw: false,
                nest: true,
            });

            resolve({
                errCode: 0,
                data: danhSach,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const themBaiHatVaoDanhSach = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat || !data.idDanhSachPhat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idBaiHat v IdDanhSachPhat

                //end kiem tra
                let maxSTT = await db.chiTietDanhSachPhat.max("stt", {
                    where: {
                        idDanhSachPhat: data.idDanhSachPhat,
                    },
                });

                let [row, created] = await db.chiTietDanhSachPhat.findOrCreate({
                    where: {
                        idBaiHat: data.idBaiHat,
                        idDanhSachPhat: data.idDanhSachPhat,
                    },
                    defaults: {
                        id: uuidv4(),
                        stt: maxSTT ? maxSTT + 1 : 1,
                    },
                });

                if (created) {
                    resolve({
                        errCode: 0,
                        data: row,
                    });
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: "Bài hát đã có trong danh sách",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const layBaiHatTrongDanhSach = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDanhSachPhat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idDanhSachPhat

                //end Kiem tra

                let chiTietDS = await db.danhSachPhat.findOne({
                    where: {
                        id: data.idDanhSachPhat,
                        idUser: payload.id,
                    },
                    include: [
                        {
                            model: db.chiTietDanhSachPhat,
                            include: [
                                {
                                    model: db.baihat,
                                    include: [
                                        {
                                            model: db.baiHat_caSi,
                                            include: [
                                                {
                                                    model: db.casi
                                                }
                                            ]
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    order: [[{ model: db.chiTietDanhSachPhat }, "stt", "asc"]],
                    raw: false,
                    nest: true,
                });

                resolve({
                    errCode: 0,
                    data: chiTietDS,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const xoaBaiHatKhoiDanhSach = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDanhSachPhat || !data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idDanhSachPhat va idBaiHat

                //end Kiem tra

                let chiTietDanhSachPhat = await db.chiTietDanhSachPhat.findOne({
                    where: {
                        idDanhSachPhat: data.idDanhSachPhat,
                        idBaiHat: data.idBaiHat,
                    },
                    raw: false,
                });

                if (!chiTietDanhSachPhat) {
                    resolve({
                        errCode: 2,
                        errMessage: "Chi tiết danh sách phát không tồn tại",
                    });
                } else {
                    await chiTietDanhSachPhat.destroy();
                    resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const xoaDanhSachPhat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDanhSachPhat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idDanhSachPhat

                //end Kiem tra

                await db.danhSachPhat.destroy({
                    where: {
                        id: data.idDanhSachPhat,
                        idUser: payload.id,
                    },
                });

                await db.chiTietDanhSachPhat.destroy({
                    where: {
                        idDanhSachPhat: data.idDanhSachPhat,
                    },
                });

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const layBaiHatCuaCaSi = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idCaSi) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idCaSi

                //end Kiem tra

                let baihats = await db.baihat.findAll({
                    include: [
                        {
                            model: db.baiHat_caSi,
                            where: {
                                idCaSi: data.idCaSi,
                            },
                            include: [
                                { model: db.casi }
                            ]
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                let listIdBH = baihats.map(item => item.id)
                let baihats2 = await db.baihat.findAll({
                    where: {
                        id: {
                            [Op.in]: listIdBH
                        }
                    },
                    include: [
                        {
                            model: db.baiHat_caSi,
                            include: [
                                { model: db.casi }
                            ]
                        },
                    ],
                    raw: false,
                    nest: true,
                });



                resolve({
                    errCode: 0,
                    data: baihats2,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};
const goiYCaSi = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            //kiem tra idCaSi

            //end Kiem tra

            let listCS;

            if (data.idCaSi) {
                listCS = await db.casi.findAll({
                    where: {
                        id: {
                            [Op.ne]: data.idCaSi,
                        },
                    },
                    limit: +data.limit || 10,
                    raw: false,
                });
            } else {
                listCS = await db.casi.findAll({
                    limit: +data.limit || 10,
                });
            }

            resolve({
                errCode: 0,
                data: listCS,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const layCaSiById = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idCaSi) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                //kiem tra idCaSi

                //end Kiem tra
                let casi = await db.casi.findOne({
                    where: {
                        id: data.idCaSi,
                    },
                });
                if (!casi) {
                    return resolve({
                        errCode: 2,
                        errMessage: "Không tìm thấy ca sĩ",
                    });
                }

                let countQuanTam = await db.quanTamCaSi.count({
                    where: {
                        idCaSi: data.idCaSi
                    }
                })

                resolve({
                    errCode: 0,
                    data: casi,
                    countQuanTam
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const timKiemBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tenBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let offset = +data.offset || 0;
                let limit = +data.limit || 10;

                let listBH = await db.baihat.findAll({
                    include: [
                        {
                            model: db.baiHat_caSi,
                            include: [
                                {
                                    model: db.casi
                                }
                            ]
                        },
                    ],
                    raw: false,
                    nest: true,
                });

                const options = {
                    keys: ["tenBaiHat", "loiBaiHat"],
                };

                const fuse = new Fuse(listBH, options);

                const result = fuse.search(data.tenBaiHat);


                //them tu khoa
                let [keyword, created] = await db.keywordSearchs.findOrCreate({
                    where: {
                        keyword: data.tenBaiHat.toLowerCase(),
                    },
                    defaults: {
                        amount: 1,
                        id: uuidv4(),
                    },
                    raw: false,
                });

                if (!created) {
                    keyword.amount = keyword.amount + 1;
                    await keyword.save();
                }


                resolve({
                    errCode: 0,
                    data: result.slice(offset * limit, limit),
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const timKiemCaSi = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tenCaSi) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let offset = +data.offset || 0;
                let limit = +data.limit || 10;

                let listCS = await db.casi.findAll({ raw: false });

                console.log(listCS[0].tenCaSi);

                const options = {
                    keys: ["tenCaSi", "moTa"],
                };

                const fuse = new Fuse(listCS, options);

                const result = fuse.search(data.tenCaSi);

                resolve({
                    errCode: 0,
                    data: result.slice(offset * limit, limit),
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const doiTenDanhSach = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idDanhSach || !data.tenDanhSach) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                if (data.tenDanhSach.length > 30) {
                    return resolve({
                        errCode: 4,
                        errMessage: "Tên danh sách quá dài",
                    });
                }

                let danhsach = await db.danhSachPhat.findOne({
                    where: {
                        id: data.idDanhSach,
                        idUser: payload.id,
                    },
                    raw: false,
                });

                if (!danhsach) {
                    return resolve({
                        errCode: 2,
                        errMessage: "Không tìm thấy danh sách nào",
                    });
                } else {
                    let checkTen = await db.danhSachPhat.findOne({
                        where: {
                            idUser: payload.id,
                            tenDanhSach: data.tenDanhSach,
                        },
                    });
                    if (checkTen && checkTen.id !== data.idDanhSach) {
                        return resolve({
                            errCode: 3,
                            errMessage: "Tên danh sách đã tồn tại",
                        });
                    }

                    danhsach.tenDanhSach = data.tenDanhSach;
                    await danhsach.save();

                    return resolve({
                        errCode: 0,
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const doiViTriBaiHatTrongDS = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idFrom || !data.idTo || !data.idDanhSach) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let dataFrom = await db.chiTietDanhSachPhat.findOne({
                    where: {
                        idDanhSachPhat: data.idDanhSach,
                    },
                    include: [
                        {
                            model: db.baihat,
                            where: {
                                id: data.idFrom,
                            },
                        },
                    ],
                    nest: true,
                    raw: false,
                });

                let dataTo = await db.chiTietDanhSachPhat.findOne({
                    where: {
                        idDanhSachPhat: data.idDanhSach,
                    },
                    include: [
                        {
                            model: db.baihat,
                            where: {
                                id: data.idTo,
                            },
                        },
                    ],
                    nest: true,
                    raw: false,
                });

                if (!dataFrom || !dataTo) {
                    return resolve({
                        errCode: 2,
                        errMessage: "Không tìm thấy bài hát trong ds",
                    });
                }

                let tam = dataFrom.stt;
                dataFrom.stt = dataTo.stt;
                dataTo.stt = tam;

                await dataFrom.save();
                await dataTo.save();

                resolve({
                    errCode: 0,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const layDanhSachThongBao = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let limit = +data.limit || 10;
            let offset = +data.offset || 0;

            let thongBaos = await db.thongBao.findAll({
                limit,
                offset,
                order: [["createdAt", "desc"]],
            });

            resolve({
                errCode: 0,
                data: thongBaos,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const toggleYeuThichBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let [row, create] = await db.yeuThichBaiHat.findOrCreate({
                    where: {
                        idUser: payload.id,
                        idBaiHat: data.idBaiHat,
                    },
                    defaults: {
                        id: uuidv4(),
                    },
                    raw: false,
                });

                if (create) {
                    resolve({
                        errCode: 0,
                        errMessage: "like",
                    });
                } else {
                    await row.destroy();

                    resolve({
                        errCode: 0,
                        errMessage: "notLike",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const kiemTraYeuThichBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let row = await db.yeuThichBaiHat.findOne({
                    where: {
                        idUser: payload.id,
                        idBaiHat: data.idBaiHat,
                    },
                });

                if (row) {
                    resolve({
                        errCode: 0,
                        errMessage: "like",
                    });
                } else {
                    resolve({
                        errCode: 0,
                        errMessage: "notLike",
                    });
                }
            }
        } catch (e) {
            reject(e);
        }
    });
};

const layDanhSachBaiHatYeuThich = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {

            let order_by = data.order_by || 'createdAt'
            let order_type = data.order_type || 'desc'

            let row = await db.yeuThichBaiHat.findAll({
                where: {
                    idUser: payload.id,
                },
                include: [
                    {
                        model: db.baihat,
                        include: [
                            {
                                model: db.baiHat_caSi,
                                include: [
                                    {
                                        model: db.casi
                                    }
                                ]
                            }
                        ]
                    },
                ],
                order: [[order_by, order_type]],
                raw: false,
                nest: true,
            });

            resolve({
                errCode: 0,
                data: row
            });
        } catch (e) {
            reject(e);
        }
    });
};

const toggleQuanTamCaSi = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idCaSi) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                let [row, created] = await db.quanTamCaSi.findOrCreate({
                    where: {
                        idUser: payload.id,
                        idCaSi: data.idCaSi
                    },
                    defaults: {
                        id: uuidv4()
                    },
                    raw: false,
                });

                if (created) {

                    resolve({
                        errCode: 0,
                        errMessage: 'yes'
                    });
                }
                else {
                    await row.destroy();
                    resolve({
                        errCode: 0,
                        errMessage: 'no'
                    });
                }

            }
        } catch (e) {
            reject(e);
        }
    });
};

const layDanhSachCaSiQuanTam = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {

            let row = await db.quanTamCaSi.findAll({
                where: {
                    idUser: payload.id,
                },
                include: [
                    {
                        model: db.casi
                    }
                ],
                nest: true,

                raw: false,
            });


            resolve({
                errCode: 0,
                data: row
            });


        } catch (e) {
            reject(e);
        }
    });
};

const kiemTraQuanTamCaSi = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idCaSi) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            }
            else {
                let row = await db.quanTamCaSi.findAll({
                    where: {
                        idUser: payload.id,
                        idCaSi: data.idCaSi
                    },

                });
                //
                if (!row || row.length === 0) {
                    return resolve({
                        errCode: 0,
                        errMessage: "no"
                    });
                }
                else {
                    return resolve({
                        errCode: 0,
                        errMessage: "yes"
                    });
                }

            }


        } catch (e) {
            reject(e);
        }
    });
};

const getListRandomBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {

            let limit = +data.limit || 20
            let minusId = data.minusId || []

            let listBH = await db.baihat.findAll({
                where: {
                    id: {
                        [Op.notIn]: minusId
                    }
                },
                include: [
                    {
                        model: db.baiHat_caSi,
                        include: [
                            {
                                model: db.casi
                            }
                        ]
                    }
                ],
                limit: limit,
                order: db.sequelize.random(),
                nest: true,
                raw: false,
            })

            resolve({
                errCode: 0,
                data: listBH
            });

        } catch (e) {
            reject(e);
        }
    });
};


const addCommentParent = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat || !data.noiDung) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                if (data.noiDung.length > 500) {
                    return resolve({
                        errCode: 2,
                        errMessage: 'Nội dung không được vượt quá 500 kí tự'
                    });
                }

                let tgHienTai = new Date().getTime();

                let row = await db.commentBHParent.create({
                    id: uuidv4(),
                    idBaiHat: data.idBaiHat,
                    noiDung: data.noiDung,
                    idUser: payload.id,
                    thoiGian: tgHienTai,
                    countLike: 0
                })

                let user = await db.User.findOne({
                    where: {
                        id: payload.id
                    },
                    attributes: ['id', 'firstName', 'lastName', 'typeAccount', 'avatarFacebook',
                        'avatarGithub', 'avatarGoogle', 'avatarUpdate'
                    ]
                })

                row = { ...row.dataValues, User: user }


                resolve({
                    errCode: 0,
                    data: row
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const addCommentChild = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idCommentParent || !data.noiDung || !data.nameUserReply) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                if (data.noiDung.length > 500) {
                    return resolve({
                        errCode: 2,
                        errMessage: 'Nội dung không được vượt quá 500 kí tự'
                    });
                }

                let tgHienTai = new Date().getTime();

                let row = await db.commentBHCon.create({
                    id: uuidv4(),
                    idUser: payload.id,
                    noiDung: data.noiDung,
                    thoiGian: tgHienTai,
                    countLike: 0,
                    idCommentCha: data.idCommentParent,
                    nameUserReply: data.nameUserReply
                })

                let user = await db.User.findOne({
                    where: {
                        id: payload.id
                    },
                    attributes: ['id', 'firstName', 'lastName', 'typeAccount', 'avatarFacebook',
                        'avatarGithub', 'avatarGoogle', 'avatarUpdate'
                    ]
                })

                row = { ...row.dataValues, User: user }

                resolve({
                    errCode: 0,
                    data: row
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const toggleLikeComment = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idComment || !data.type || !data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                let comment;
                if (data.type === 'parent') {
                    comment = await db.commentBHParent.findOne({
                        where: {
                            id: data.idComment,
                        },
                        raw: false
                    })
                }
                else {
                    comment = await db.commentBHCon.findOne({
                        where: {
                            id: data.idComment,
                        },
                        raw: false
                    })
                }

                let [row, created] = await db.likeCommentBH.findOrCreate({
                    where: {
                        idUser: payload.id,
                        idComment: data.idComment,
                        type: data.type,
                        idBaiHat: data.idBaiHat
                    },
                    defaults: {
                        id: uuidv4()
                    },
                    raw: false
                })

                if (created) {
                    comment.countLike = comment.countLike + 1;
                    await comment.save()
                    return resolve({
                        errCode: 0,
                        errMessage: 'yes'
                    });
                }
                else {
                    await row.destroy();
                    comment.countLike = comment.countLike - 1;
                    await comment.save()
                    return resolve({
                        errCode: 0,
                        errMessage: 'no'
                    });
                }

            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListCommentByIdBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                let listCmt = await db.commentBHParent.findAll({
                    where: {
                        idBaiHat: data.idBaiHat
                    },
                    include: [
                        {
                            model: db.commentBHCon,
                            include: [
                                {
                                    model: db.User,
                                    attributes: ['id', 'firstName', 'lastName', 'typeAccount', 'avatarFacebook',
                                        'avatarGithub', 'avatarGoogle', 'avatarUpdate'
                                    ]
                                }
                            ]
                        },
                        {
                            model: db.User,
                            attributes: ['id', 'firstName', 'lastName', 'typeAccount', 'avatarFacebook',
                                'avatarGithub', 'avatarGoogle', 'avatarUpdate'
                            ]
                        }
                    ],
                    order: [['createdAt', 'desc']],
                    raw: false,
                    nest: true
                })


                resolve({
                    errCode: 0,
                    data: listCmt
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const getListIdLikeComment = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                let listId = await db.likeCommentBH.findAll({
                    where: {
                        idBaiHat: data.idBaiHat,
                        idUser: payload.id
                    },
                    attributes: ['idComment']
                })


                resolve({
                    errCode: 0,
                    data: listId
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const tangViewBaiHat = (data, payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.idBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                let currentBH = await db.baihat.findOne({
                    where: {
                        id: data.idBaiHat
                    },
                    raw: false
                })

                if (!currentBH) {
                    return resolve({
                        errCode: 1,
                        errMessage: "Khong tim thay bai hat",
                    });
                }

                currentBH.luotNghe = currentBH.luotNghe + 1
                await currentBH.save();

                resolve({
                    errCode: 0,
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const getGoiYMVBaiHat = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.listIdBaiHat) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {

                let listId = JSON.parse(data.listIdBaiHat) || ["0f5bb886-effd-4d77-b27d-74aafcc78f58"]

                let listBH = await db.baihat.findAll({
                    where: {
                        id: {
                            [Op.notIn]: listId
                        },
                        linkMV: {
                            [Op.ne]: 'false'
                        }
                    },
                    include: [
                        {
                            model: db.baiHat_caSi,
                            include: [
                                { model: db.casi }
                            ]
                        }
                    ],
                    limit: 10,
                    order: db.sequelize.random(),
                    nest: true,
                    raw: false
                })



                resolve({
                    errCode: 0,
                    data: listBH,
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const timKiemMV = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.value) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {


                let listBH = await db.baihat.findAll({
                    where: {
                        linkMV: {
                            [Op.ne]: 'false'
                        }
                    },
                    include: [
                        {
                            model: db.baiHat_caSi,
                            include: [
                                { model: db.casi }
                            ]
                        },
                    ],
                    nest: true,
                    raw: false
                })

                const options = {
                    keys: ["tenBaiHat", "loiBaiHat", "baiHat_caSis.casi.tenCaSi"],
                };

                const fuse = new Fuse(listBH, options);

                const result = fuse.search(data.value);



                resolve({
                    errCode: 0,
                    data: result.slice(0, 10),
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};


const testWebsocket = (data) => {
    return new Promise(async (resolve, reject) => {
        try {

            handleEmit("test-socket", data)

            resolve({
                errCode: 0,
                data
            });

        } catch (e) {
            reject(e);
        }
    });
};


const themTuThuong = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau || !data.tuKetThuc) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.tuKetThuc = data.tuKetThuc.toLowerCase()

                let [tuBD, created] = await db.TuBatDaus.findOrCreate({
                    where: {
                        label: data.tuBatDau
                    },
                    defaults: {
                        id: uuidv4()
                    },
                });

                const amount = await db.TuKetThucs.count({
                    where: {
                        idTuBatDau: tuBD.id
                    },
                });

                let [tuKT, created2] = await db.TuKetThucs.findOrCreate({
                    where: {
                        idTuBatDau: tuBD.id,
                        label: data.tuKetThuc,
                    },
                    defaults: {
                        id: uuidv4(),
                        type: 'normal',
                        stt: amount + 1
                    },
                    raw: false

                });

                if (!created2) {
                    tuKT.stt = tuKT.stt === amount ? amount : amount + tuKT.stt;
                    await tuKT.save();
                }


                resolve({
                    errCode: 0,
                    mess: 'success'
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const themTuDie = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau || !data.tuKetThuc) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.tuKetThuc = data.tuKetThuc.toLowerCase()

                let [tuBD, created] = await db.TuBatDaus.findOrCreate({
                    where: {
                        label: data.tuBatDau
                    },
                    defaults: {
                        id: uuidv4()
                    },
                });

                const amount = await db.TuKetThucs.count({
                    where: {
                        idTuBatDau: tuBD.id
                    },
                });

                let [tuKT, created2] = await db.TuKetThucs.findOrCreate({
                    where: {
                        idTuBatDau: tuBD.id,
                        label: data.tuKetThuc,
                    },
                    defaults: {
                        id: uuidv4(),
                        type: 'die',
                        stt: amount + 1
                    },
                    raw: false
                });

                if (!created2) {
                    tuKT.type = 'die'
                    tuKT.stt = tuKT.stt === amount ? amount : amount + tuKT.stt;
                    await tuKT.save();
                }

                //v1
                await db.TuKetThucs.update(
                    { type: 'die', },
                    {
                        where: {
                            label: data.tuKetThuc,
                        },
                    },
                );


                let listTuNguyHiem = await db.TuKetThucs.findAll({
                    where: {
                        label: data.tuKetThuc,
                    },
                })

                for (const element of listTuNguyHiem) {
                    let labelTuBatDau = await db.TuBatDaus.findOne({
                        where: {
                            id: element.idTuBatDau
                        }
                    })

                    await db.TuKetThucs.update(
                        { type: 'warning', },
                        {
                            where: {
                                label: labelTuBatDau.label
                            },
                        },
                    );
                }



                resolve({
                    errCode: 0,
                    mess: 'success'
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

const themTraLoi = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau || !data.tuKetThuc) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {


                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.tuKetThuc = data.tuKetThuc.toLowerCase()

                let [tuBD, created] = await db.TuBatDaus.findOrCreate({
                    where: {
                        label: data.tuBatDau
                    },
                    defaults: {
                        id: uuidv4()
                    },
                });


                let [tuKT, created2] = await db.TuKetThucs.findOrCreate({
                    where: {
                        idTuBatDau: tuBD.id,
                        label: data.tuKetThuc,
                    },
                    defaults: {
                        id: uuidv4(),
                        type: 'normal',
                        stt: 1
                    },
                    raw: false
                });

                tuKT.stt = tuKT.stt === amount ? amount : amount + tuKT.stt;
                await tuKT.save();
                if (created2)
                    await updateTypeTuMoi(data.tuBatDau, data.tuKetThuc)


                resolve({
                    errCode: 0,
                    mess: 'success',
                    isCreate: created2
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};


const updateTypeTuMoi = async (strTuBatDau, strTuKetThuc) => {
    // vi du: học bạ  -- từ normal, warning, die

    // cập nhật từ "bạ" và những từ kết nối với từ "bạ"
    let typeTuKetThuc = await kiemTraLoaiTu(strTuKetThuc)
    if (typeTuKetThuc === 'die') {
        // chuyển từ "bạ" thành die
        await db.TuKetThucs.update(
            { type: 'die' },
            {
                where: {
                    label: strTuKetThuc // bạ
                },
            },
        );

        // chuyển tất cả từ kết nối với từ "bạ" thành warning: gồm từ "học" và cả các từ khác
        let listTubatdau = await db.TuBatDaus.findAll({
            include: [
                {
                    model: db.TuKetThucs,
                    where: {
                        label: strTuKetThuc // bạ
                    }
                }
            ],
            nest: true,
            raw: false
        })

        for (let tuBatDau of listTubatdau) {
            await db.TuKetThucs.update(
                { type: 'warning' },
                {
                    where: {
                        label: tuBatDau.dataValues.label
                    },
                },
            );
        }
    }
    else if (typeTuKetThuc === 'warning') {
        await db.TuKetThucs.update(
            { type: 'warning' },
            {
                where: {
                    label: strTuKetThuc // bạ
                },
            },
        );
    }
    else {
        await db.TuKetThucs.update(
            { type: 'normal' },
            {
                where: {
                    label: strTuKetThuc // bạ
                },
            },
        );
    }

    // cập nhật từ "học" và những từ từng xem từ "học" là từ die: từ "học" không thể là từ die
    let typeTuBatDau = await kiemTraLoaiTu(strTuBatDau)
    if (typeTuBatDau === 'warning') {
        await db.TuKetThucs.update(
            { type: 'warning' },
            {
                where: {
                    label: strTuBatDau // hoc
                },
            },
        );
    }
    else {
        await db.TuKetThucs.update(
            { type: 'normal' },
            {
                where: {
                    label: strTuBatDau // hoc
                },
            },
        );
    }

    let listTubatdau = await db.TuBatDaus.findAll({
        include: [
            {
                model: db.TuKetThucs,
                where: {
                    label: strTuBatDau // học
                }
            }
        ],
        nest: true,
        raw: false
    })

    for (let tuBatDau of listTubatdau) {
        let tuKetThucTypeDie = await db.TuKetThucs.findOne({
            where: {
                idTuBatDau: tuBatDau.dataValues.id,
                type: 'die'
            }
        })
        // nếu không có kết nối với từ die khác: đổi thành normal, còn không thì giữ nguyên
        if (!tuKetThucTypeDie) {

            await db.TuKetThucs.update(
                { type: 'normal' },
                {
                    where: {
                        label: tuBatDau.dataValues.label
                    },
                },
            );
        }
        else {
            await db.TuKetThucs.update(
                { type: 'warning' },
                {
                    where: {
                        label: tuBatDau.dataValues.label
                    },
                },
            );
        }

    }




}

const kiemTraLoaiTu = async (tuVung) => {
    let tuBatDau = await db.TuBatDaus.findOne({
        where: {
            label: tuVung
        }
    })

    let tuKetThuc = await db.TuKetThucs.findOne({
        where: {
            idTuBatDau: tuBatDau.id,
        }
    })

    // nếu không kết nối với từ kết thúc thì là từ die
    if (!tuKetThuc) {
        return 'die';
    }
    // Không phải từ die
    else {
        let tuKetThucTypeDie = await db.TuKetThucs.findOne({
            where: {
                idTuBatDau: tuBatDau.id,
                type: 'die'
            }
        })

        // nếu kết nối với từ die: là từ warning
        if (tuKetThucTypeDie) {
            return 'warning';
        }
        // còn không là từ normal
        else {
            return 'normal';
        }

    }

}

const timTuGoiY = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.listWord = data.listWord ?? []

                let [tuBD, created] = await db.TuBatDaus.findOrCreate({
                    where: {
                        label: data.tuBatDau
                    },
                    defaults: {
                        id: uuidv4()
                    },
                });

                let tuDie = await db.TuKetThucs.findOne({
                    where: {
                        idTuBatDau: tuBD.id,
                        type: 'die',
                        label: {
                            [Op.notIn]: data.listWord
                        }
                    },
                    order: [['stt', 'asc']],
                });

                if (tuDie) {
                    await db.TuKetThucs.increment(
                        {
                            stt: 10
                        }, {
                        where: {
                            id: tuDie.id
                        }
                    })
                    return resolve({
                        errCode: 0,
                        data: tuDie.label,
                        type: tuDie.type
                    });
                }

                let tuNormal = await db.TuKetThucs.findOne({
                    where: {
                        idTuBatDau: tuBD.id,
                        type: 'normal',
                        label: {
                            [Op.notIn]: data.listWord
                        }
                    },
                    order: [['stt', 'asc']],
                });

                if (tuNormal) {
                    await db.TuKetThucs.increment(
                        {
                            stt: 10
                        }, {
                        where: {
                            id: tuNormal.id
                        }
                    })
                    return resolve({
                        errCode: 0,
                        data: tuNormal.label,
                        type: tuNormal.type
                    });
                }

                let tuWarning = await db.TuKetThucs.findOne({
                    where: {
                        idTuBatDau: tuBD.id,
                        type: 'warning',
                        label: {
                            [Op.notIn]: data.listWord
                        }
                    },
                    order: [['stt', 'asc']],
                });


                if (tuWarning) {
                    // let labelTuDien
                    // let size = contentJson.length
                    // for (let i = 0; i < size; i++) {
                    //     if (data.listWord.includes(contentJson[i]) && contentJson[i].split(' ')[0] === data.tuBatDau) {
                    //         labelTuDien = contentJson[i].split(' ')[1]
                    //         contentJson.splice(i, 1)
                    //         break
                    //     }
                    // }
                    await db.TuKetThucs.increment(
                        {
                            stt: 10
                        }, {
                        where: {
                            id: tuWarning.id
                        }
                    })
                    return resolve({
                        errCode: 0,
                        data: tuWarning.label,
                        // dataTuDien: labelTuDien,
                        type: tuWarning.type,
                        type2: 'warning'
                    });
                }



                let size = contentJson.length
                let dataRes
                for (let i = 0; i < size; i++) {
                    if (!data.listWord.includes(contentJson[i]) && contentJson[i].split(' ')[0] === data.tuBatDau) {
                        let label = contentJson[i].split(' ')[1]
                        contentJson.splice(i, 1)
                        dataRes = {
                            errCode: 1,
                            data: label,
                            type: "tuDien",
                            type2: 'tuDien'
                        };
                        break
                    }
                }
                if (dataRes) {
                    return resolve(dataRes)
                }


                return resolve({
                    errCode: 1,
                    mess: "not found"
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const listTuKetThuc = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                data.listWord = data.listWord ?? []
                data.tuBatDau = data.tuBatDau.toLowerCase()

                let tubatdau = await db.TuBatDaus.findOne({
                    where: {
                        label: data.tuBatDau
                    }
                })

                let tuKetThucs = await db.TuKetThucs.findAll({
                    where: {
                        idTuBatDau: tubatdau.id,
                        label: {
                            [Op.notIn]: data.listWord
                        }
                    }
                })

                return resolve({
                    errCode: 0,
                    data: tuKetThucs
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};


const xoaTu = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau || !data.tuKetThuc) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {
                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.tuKetThuc = data.tuKetThuc.toLowerCase()

                let [tuBD, created] = await db.TuBatDaus.findOrCreate({
                    where: {
                        label: data.tuBatDau
                    },
                    defaults: {
                        id: uuidv4()
                    },
                });


                let tuDie = await db.TuKetThucs.findOne({
                    where: {
                        idTuBatDau: tuBD.id,
                        label: data.tuKetThuc
                    },
                    raw: false
                });

                if (tuDie)
                    await tuDie.destroy();


                return resolve({
                    errCode: 0,
                    mess: "success"
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};

const updateTuDien = (data) => {
    return new Promise(async (resolve, reject) => {
        try {

            let size = contentJson.length
            let i = 0
            let acctions = []
            for (let word of contentJson) {
                i++
                acctions.push(themTraLoi({
                    tuBatDau: word.split(' ')[0],
                    tuKetThuc: word.split(' ')[1]
                }))
                if (i % 50 === 0) {
                    await Promise.all(acctions).then((values) => {
                        console.log(i);
                    });
                    acctions = []
                }
                console.log(`processing... ${i}/${size}`);
            }

            // Promise.all(acctions).then((values) => {
            //     console.log(values);
            // });

            return resolve({
                errCode: 1,
                mess: "not found"
            });


            // let newArr = contentJson
            // let tuBatDaus = await db.TuBatDaus.findAll()
            // let size = tuBatDaus.length
            // let i = 0
            // for (let tbd of tuBatDaus) {
            //     i++
            //     let tuKetThucs = await db.TuKetThucs.findAll({
            //         where: {
            //             idTuBatDau: tbd.id
            //         }
            //     })
            //     for (let tkt of tuKetThucs) {
            //         newArr = newArr.filter(item => item !== `${tbd.label} ${tkt.label}`);
            //     }
            //     console.log(`processing... ${i}/${size}`);
            // }

            // const jsonContent = JSON.stringify(newArr, null, 2);
            // fs.writeFile('content-json.json', jsonContent, 'utf8', (err) => {
            //     if (err) {
            //         console.error('Error writing to JSON file:', err);
            //     }
            //     console.log('JSON file overwritten successfully.');
            // });


        } catch (e) {
            reject(e);
        }
    });
};

const trainingData = (data) => {
    return new Promise(async (resolve, reject) => {
        try {

            // resolve({
            //     errCode: 0,
            //     mess: "Hello"
            // });


            console.log("Start Training");

            // loc tu sai
            // let allData = await db.TuBatDaus.findAll({
            //     include: [
            //         {
            //             model: db.TuKetThucs
            //         }
            //     ],
            //     raw: false,
            //     nest: true,
            //     // limit: 10
            // })


            // // console.log(allData[0].dataValues);
            // let soLoi = 0
            // let soVong = 0
            // let tongSoVong = allData.length
            // for (let item of allData) {
            //     soVong++
            //     item = item.dataValues
            //     let tuKetThucs = item.TuKetThucs

            //     if (tuKetThucs.length !== 0) {

            //         for (let tuKetThuc of tuKetThucs) {
            //             tuKetThuc = tuKetThuc.dataValues
            //             let word = item.label + ' ' + tuKetThuc.label

            //             // Gửi yêu cầu GET
            //             let response = await axios.get(`https://noitu.pro/answer?word=${word}`);
            //             response = response.data


            //             if (response.success) {

            //             }
            //             else {
            //                 soLoi++
            //                 console.log(soLoi, `${soVong}/${tongSoVong}`);
            //                 await db.TuKetThucs.destroy({
            //                     where: {
            //                         idTuBatDau: item.id,
            //                         label: tuKetThuc.label
            //                     },
            //                 })
            //             }

            //         }
            //     }
            // }

            //end loc tu sai


            //them tu
            // let soVong = +data.from
            // let soTu = 0
            // let tongSoVong = contentJson.length
            // let timestamp = new Date().getTime()

            // contentJson = contentJson.slice(soVong);

            // for (let item of contentJson) {
            //     soVong++
            //     let tuBatDau = item.split(' ')[0]
            //     let tuKetThuc = item.split(' ')[1]

            //     let response = await axios.get(`https://noitu.pro/answer?word=${item}`);
            //     response = response.data


            //     if (response.success) {


            //         let [TBD, createdTBD] = await db.TuBatDaus.findOrCreate({
            //             where: { label: tuBatDau },
            //             defaults: {
            //                 id: uuidv4(),
            //             },
            //             // raw: false,
            //         });

            //         let randomNumber = Math.floor(Math.random() * 100) + 1;
            //         let [TKT, createdTKT] = await db.TuKetThucs.findOrCreate({
            //             where: { label: tuKetThuc, idTuBatDau: TBD.id },
            //             defaults: {
            //                 id: uuidv4(),
            //                 stt: randomNumber,
            //                 type: 'normal'
            //             },
            //             // raw: false,
            //         });

            //         if (createdTKT) {
            //             soTu++
            //             let timestamp2 = new Date().getTime()
            //             console.log(`${Math.floor((timestamp2 - timestamp) / 1000)}\t`, soTu, "\t", item, `\t${soVong}/${tongSoVong}`);
            //         }

            //     }

            // }

            //end them tu


            //đánh dấu từ die
            // let listTubatdau = await db.TuBatDaus.findAll()
            // console.log("length tubatdau: ", listTubatdau.length);

            // listTubatdau = listTubatdau.slice(0);

            // let i = 0
            // for (let tuBatDau of listTubatdau) {
            //     i++
            //     let findKetThuc = await db.TuKetThucs.findOne({
            //         where: {
            //             idTuBatDau: tuBatDau.id
            //         }
            //     })
            //     if (!findKetThuc) {
            //         await db.TuKetThucs.update(
            //             { type: 'die' },
            //             {
            //                 where: {
            //                     label: tuBatDau.label
            //                 },
            //             },
            //         );
            //         console.log(i, tuBatDau.label, 'die');
            //     }
            //     else {
            //         console.log(i, tuBatDau.label);
            //     }
            // }
            //end đánh dấu từ die

            //đánh dấu từ warning
            // let listTuDie = await db.TuKetThucs.findAll({
            //     where: {
            //         type: 'die'
            //     }
            // })
            // console.log("length tu die: ", listTuDie.length);
            // listTuDie = listTuDie.map(item => item.label)
            // listTuDie = [...new Set(listTuDie)];
            // console.log("length tu die: ", listTuDie.length);


            // let i = 0;
            // for (let tuDie of listTuDie) {
            //     i++
            //     console.log(i, tuDie);
            //     let listTubatdau = await db.TuBatDaus.findAll({
            //         include: [
            //             {
            //                 model: db.TuKetThucs,
            //                 where: {
            //                     label: tuDie
            //                 }
            //             }
            //         ],
            //         nest: true,
            //         raw: false
            //     })

            //     for (let tuBatDau of listTubatdau) {
            //         await db.TuKetThucs.update(
            //             { type: 'warning' },
            //             {
            //                 where: {
            //                     label: tuBatDau.dataValues.label
            //                 },
            //             },
            //         );
            //     }


            // }

            //end đánh dấu warning

            // get danh sach tu
            let allData = await db.TuBatDaus.findAll({
                include: [
                    {
                        model: db.TuKetThucs
                    }
                ],
                raw: false,
                nest: true,
                // limit: 10
            })

            allData = allData.map(item => {
                let arr = item.TuKetThucs.map(item2 => {
                    return item.label + " " + item2.label
                })
                return arr
            }).flat(2)

            const jsonContent = JSON.stringify(allData, null, 2);
            fs.writeFile('all-data-noi-tu.json', jsonContent, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to JSON file:', err);
                }
                console.log('JSON file overwritten successfully.');
            });



            // end get danh sach tu



            console.log("End Training");


            resolve({
                errCode: 0,
                mess: "Hello"
            });


        } catch (e) {
            reject(e);
        }
    });
};

const kiemTraTuTonTai = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.tuBatDau || !data.tuKetThuc) {
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameter!",
                    data,
                });
            } else {


                data.tuBatDau = data.tuBatDau.toLowerCase()
                data.tuKetThuc = data.tuKetThuc.toLowerCase()

                let tuVung = await db.TuBatDaus.findOne({
                    where: {
                        label: data.tuBatDau
                    },
                    include: [
                        {
                            model: db.TuKetThucs,
                            where: {
                                label: data.tuKetThuc
                            }
                        }
                    ],
                    nest: true,
                    raw: false
                })

                resolve({
                    errCode: 0,
                    mess: 'success',
                    isExit: !!tuVung
                });

            }
        } catch (e) {
            reject(e);
        }
    });
};


module.exports = {
    CreateUser,
    verifyCreateUser,
    userLogin,
    refreshToken,
    getUserLogin,
    loginGoogle,
    loginFacebook,
    loginGithub,
    addProductToCart,
    addCartOrMoveCart,
    addNewAddressUser,
    getAddressUser,
    setDefaultAddress,
    deleteAddressUser,
    editAddressUser,
    getListCartUser,
    editAmountCartUser,
    chooseProductInCart,
    deleteProductInCart,
    updateClassifyProductInCart,
    createNewBill,
    chooseAllProductInCart,
    getUserLoginRefreshToken,
    getListBillByType,
    userCancelBill,
    userRepurchaseBill,
    getCodeVeridyForgetPass,
    changePassForget,
    checkKeyVerify,
    hasReceivedProduct,
    buyProductByCard,
    buyProductByCardSucess,
    createNewEvaluateProduct,
    uploadVideoEvaluateProduct,
    uploadImagesEvaluateProduct,
    createNewEvaluateProductFailed,
    updataEvaluateProduct,
    deleteVideoEvaluate,
    updateVideoEvaluate,
    updateProfileUser,
    updateAvatarUser,
    getConfirmCodeChangePass,
    confirmCodeChangePass,
    createNewBlog,
    createNewImageBlog,
    uploadVideoNewBlog,
    getBlogEditById,
    updateBlog,
    shareProduct,
    shareBlog,
    toggleLikeBlog,
    createNewCommentBlog,
    createNewShortVideo,
    uploadCoverImageShortVideo,
    uploadVideoForShortVideo,
    getShortVideoById,
    updateShortVideoById,
    getListBlogUserByPage,
    deleteBlogUserById,
    editContentBlogUserById,
    deleteCommentBlogById,
    updateCommentBlogById,
    getListBlogByIdUser,
    saveBlogCollection,
    getListCollectionBlogUserByPage,
    deleteCollectBlogById,
    createCommentShortVideo,
    deleteCommentShortVideoById,
    editCommentShortVideoById,
    toggleLikeShortVideo,
    checkUserLikeShortVideo,
    saveCollectionShortVideo,
    CheckSaveCollectionShortVideo,
    getListVideoByIdUser,
    getUserById,
    deleteShortVideoById,
    checkLikeBlogById,
    checkSaveBlogById,
    testHeaderLogin,
    getListNotifyAll,
    getListNotifyByType,
    seenNotifyOfUser,
    sendEmailFromContact,
    createNewReportVideo,
    createNewReportBlog,
    getBillById,
    getDetailBillById,
    createNewUserMobile,
    verifyCodeForCreateUserMobile,
    themDanhSachPhat,
    layDanhSachPhat,
    themBaiHatVaoDanhSach,
    layBaiHatTrongDanhSach,
    xoaBaiHatKhoiDanhSach,
    xoaDanhSachPhat,
    layBaiHatCuaCaSi,
    goiYCaSi,
    layCaSiById,
    timKiemBaiHat,
    timKiemCaSi,
    doiTenDanhSach,
    doiViTriBaiHatTrongDS,
    layDanhSachThongBao,
    toggleYeuThichBaiHat,
    kiemTraYeuThichBaiHat,
    layDanhSachBaiHatYeuThich,
    toggleQuanTamCaSi,
    layDanhSachCaSiQuanTam,
    kiemTraQuanTamCaSi,
    getListRandomBaiHat,
    addCommentParent,
    addCommentChild,
    toggleLikeComment,
    getListCommentByIdBaiHat,
    getListIdLikeComment,
    tangViewBaiHat,
    getGoiYMVBaiHat,
    timKiemMV,
    testWebsocket,
    themTuThuong,
    themTuDie,
    themTraLoi,
    timTuGoiY,
    xoaTu,
    updateTuDien,
    trainingData,
    listTuKetThuc,
    kiemTraTuTonTai
};
