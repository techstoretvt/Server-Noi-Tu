import multer from 'multer';
import userService from '../services/userService';
require('dotenv').config();

const upload = multer().single('video');

const CreateUser = async (req, res, next) => {
    try {
        //call service data
        // console.log('headers: ', req.headers);
        let data = await userService.CreateUser(req.body, req.headers);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const verifyCreateUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.verifyCreateUser(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const userLogin = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.userLogin(req.body, req.headers);
        // res.cookie('accessToken', data.data.accessToken, {
        //     httpOnly: true,
        //     maxAge: 60 * 60 * 1000, // 1 hour
        // });

        // res.cookie('refreshToken', data.data.refreshToken, {
        //     httpOnly: true,
        //     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        // });

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.refreshToken(req.body, req.headers);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getUserLogin = async (req, res, next) => {
    try {
        // let ck = req.cookies;
        // let rt = req.cookies.refreshToken;
        // console.log('cookies: ', ck);
        // console.log('refresh token: ', rt);
        //call service data
        let data = await userService.getUserLogin(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const verifyEmail = (req, res, next) => {
    res.render('verifyEmailPage.ejs');
};

const accountVerifyPage = (req, res, next) => {
    res.render('accountVerifyPage.ejs');
};

const loginGoogle = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.loginGoogle(req.body, req.headers);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const loginFacebook = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.loginFacebook(req.body, req.headers);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const loginGithub = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.loginGithub(req.body, req.headers);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const addProductToCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.addProductToCart(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const addCartOrMoveCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.addCartOrMoveCart(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const addNewAddressUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.addNewAddressUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getAddressUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.getAddressUser(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const setDefaultAddress = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.setDefaultAddress(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteAddressUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.deleteAddressUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const editAddressUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.editAddressUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListCartUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.getListCartUser(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const editAmountCartUser = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.editAmountCartUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const chooseProductInCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.chooseProductInCart(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteProductInCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.deleteProductInCart(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateClassifyProductInCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.updateClassifyProductInCart(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewBill = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.createNewBill(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const chooseAllProductInCart = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.chooseAllProductInCart(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getUserLoginRefreshToken = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.getUserLoginRefreshToken(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListBillByType = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.getListBillByType(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const userCancelBill = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.userCancelBill(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const userRepurchaseBill = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.userRepurchaseBill(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getCodeVeridyForgetPass = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.getCodeVeridyForgetPass(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const changePassForget = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.changePassForget(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const checkKeyVerify = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.checkKeyVerify(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const hasReceivedProduct = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.hasReceivedProduct(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const buyProductByCard = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.buyProductByCard(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const buyProductByCardSucess = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.buyProductByCardSucess(req.query);

        if (data.errCode === 0) {
            res.redirect(`${process.env.LINK_FONTEND}/cart/notifycation`);
        } else {
            return res.status(200).json(data);
        }
    } catch (e) {
        next(e);
    }
};

const createNewEvaluateProduct = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.createNewEvaluateProduct(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const uploadVideoEvaluateProduct = async (req, res, next) => {
    try {
        upload(req, res, function (err) {
            if (req.fileValidationError) {
                return res.send(req.fileValidationError);
            } else if (!req.file) {
                return res.send('aaaaaaa');
            } else if (err instanceof multer.MulterError) {
                return res.send(err);
            }
        });
        let data = await userService.uploadVideoEvaluateProduct(
            req.query.id,
            req.file.filename
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const uploadImagesEvaluateProduct = async (req, res, next) => {
    try {
        let data = await userService.uploadImagesEvaluateProduct({
            files: req.files,
            query: req.query,
        });

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewEvaluateProductFailed = async (req, res, next) => {
    try {
        let data = await userService.createNewEvaluateProductFailed(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updataEvaluateProduct = async (req, res, next) => {
    try {
        let data = await userService.updataEvaluateProduct(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};
const deleteVideoEvaluate = async (req, res, next) => {
    try {
        let data = await userService.deleteVideoEvaluate(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};
const updateVideoEvaluate = async (req, res, next) => {
    try {
        let data = await userService.updateVideoEvaluate(
            req.query.id,
            req.file.filename
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateProfileUser = async (req, res, next) => {
    try {
        let data = await userService.updateProfileUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateAvatarUser = async (req, res, next) => {
    try {
        let data = await userService.updateAvatarUser({
            file: req.file,
            query: req.query,
            payload: req.payload,
        });

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getConfirmCodeChangePass = async (req, res, next) => {
    try {
        let data = await userService.getConfirmCodeChangePass(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const confirmCodeChangePass = async (req, res, next) => {
    try {
        let data = await userService.confirmCodeChangePass(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewBlog = async (req, res, next) => {
    try {
        let data = await userService.createNewBlog(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewImageBlog = async (req, res, next) => {
    try {
        let data = await userService.createNewImageBlog({
            files: req.files,
            query: req.query,
        });

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const uploadVideoNewBlog = async (req, res, next) => {
    try {
        let data = await userService.uploadVideoNewBlog(
            req.query.idBlog,
            req.file.filename
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getBlogEditById = async (req, res, next) => {
    try {
        let data = await userService.getBlogEditById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateBlog = async (req, res, next) => {
    try {
        let data = await userService.updateBlog(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};
const shareProduct = async (req, res, next) => {
    try {
        let data = await userService.shareProduct(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const shareBlog = async (req, res, next) => {
    try {
        let data = await userService.shareBlog(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const toggleLikeBlog = async (req, res, next) => {
    try {
        let data = await userService.toggleLikeBlog(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewCommentBlog = async (req, res, next) => {
    try {
        let data = await userService.createNewCommentBlog(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewShortVideo = async (req, res, next) => {
    try {
        let data = await userService.createNewShortVideo(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const uploadCoverImageShortVideo = async (req, res, next) => {
    try {
        let data = await userService.uploadCoverImageShortVideo({
            file: req.file,
            query: req.query,
        });

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const uploadVideoForShortVideo = async (req, res, next) => {
    try {
        let data = await userService.uploadVideoForShortVideo(
            req.query.idShortVideo,
            req.file.filename
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getShortVideoById = async (req, res, next) => {
    try {
        let data = await userService.getShortVideoById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateShortVideoById = async (req, res, next) => {
    try {
        let data = await userService.updateShortVideoById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListBlogUserByPage = async (req, res, next) => {
    try {
        let data = await userService.getListBlogUserByPage(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteBlogUserById = async (req, res, next) => {
    try {
        let data = await userService.deleteBlogUserById(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const editContentBlogUserById = async (req, res, next) => {
    try {
        let data = await userService.editContentBlogUserById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteCommentBlogById = async (req, res, next) => {
    try {
        let data = await userService.deleteCommentBlogById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateCommentBlogById = async (req, res, next) => {
    try {
        let data = await userService.updateCommentBlogById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListBlogByIdUser = async (req, res, next) => {
    try {
        let data = await userService.getListBlogByIdUser(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const saveBlogCollection = async (req, res, next) => {
    try {
        let data = await userService.saveBlogCollection(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListCollectionBlogUserByPage = async (req, res, next) => {
    try {
        let data = await userService.getListCollectionBlogUserByPage(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteCollectBlogById = async (req, res, next) => {
    try {
        let data = await userService.deleteCollectBlogById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createCommentShortVideo = async (req, res, next) => {
    try {
        let data = await userService.createCommentShortVideo(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteCommentShortVideoById = async (req, res, next) => {
    try {
        let data = await userService.deleteCommentShortVideoById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const editCommentShortVideoById = async (req, res, next) => {
    try {
        let data = await userService.editCommentShortVideoById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const toggleLikeShortVideo = async (req, res, next) => {
    try {
        let data = await userService.toggleLikeShortVideo(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const checkUserLikeShortVideo = async (req, res, next) => {
    try {
        let data = await userService.checkUserLikeShortVideo(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const saveCollectionShortVideo = async (req, res, next) => {
    try {
        let data = await userService.saveCollectionShortVideo(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const CheckSaveCollectionShortVideo = async (req, res, next) => {
    try {
        let data = await userService.CheckSaveCollectionShortVideo(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListVideoByIdUser = async (req, res, next) => {
    try {
        let data = await userService.getListVideoByIdUser(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getUserById = async (req, res, next) => {
    try {
        let data = await userService.getUserById(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const deleteShortVideoById = async (req, res, next) => {
    try {
        let data = await userService.deleteShortVideoById(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const checkLikeBlogById = async (req, res, next) => {
    try {
        let data = await userService.checkLikeBlogById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const checkSaveBlogById = async (req, res, next) => {
    try {
        let data = await userService.checkSaveBlogById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const testHeaderLogin = async (req, res, next) => {
    try {
        // let data = await userService.testHeaderLogin(req.query)

        console.log('header', req.headers);

        // if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        //     console.log(req.headers.authorization.split(' ')[1]);
        // }
        // else {
        //     console.log('ko co');
        // }
        res.setHeader('authorization', `Bearer token.sfh.3333`);
        return res.status(200).json({
            data: 'sfsdf',
        });
    } catch (e) {
        next(e);
    }
};

const getListNotifyAll = async (req, res, next) => {
    try {
        let data = await userService.getListNotifyAll(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListNotifyByType = async (req, res, next) => {
    try {
        let data = await userService.getListNotifyByType(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const seenNotifyOfUser = async (req, res, next) => {
    try {
        let data = await userService.seenNotifyOfUser(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const sendEmailFromContact = async (req, res, next) => {
    try {
        let data = await userService.sendEmailFromContact(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewReportVideo = async (req, res, next) => {
    try {
        let data = await userService.createNewReportVideo(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewReportBlog = async (req, res, next) => {
    try {
        let data = await userService.createNewReportBlog(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getBillById = async (req, res, next) => {
    try {
        let data = await userService.getBillById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getDetailBillById = async (req, res, next) => {
    try {
        let data = await userService.getDetailBillById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const createNewUserMobile = async (req, res, next) => {
    try {
        let data = await userService.createNewUserMobile(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const verifyCodeForCreateUserMobile = async (req, res, next) => {
    try {
        let data = await userService.verifyCodeForCreateUserMobile(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const themDanhSachPhat = async (req, res, next) => {
    try {
        let data = await userService.themDanhSachPhat(req.body, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layDanhSachPhat = async (req, res, next) => {
    try {
        let data = await userService.layDanhSachPhat(req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const themBaiHatVaoDanhSach = async (req, res, next) => {
    try {
        let data = await userService.themBaiHatVaoDanhSach(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layBaiHatTrongDanhSach = async (req, res, next) => {
    try {
        let data = await userService.layBaiHatTrongDanhSach(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const xoaBaiHatKhoiDanhSach = async (req, res, next) => {
    try {
        let data = await userService.xoaBaiHatKhoiDanhSach(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const xoaDanhSachPhat = async (req, res, next) => {
    try {
        let data = await userService.xoaDanhSachPhat(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layBaiHatCuaCaSi = async (req, res, next) => {
    try {
        let data = await userService.layBaiHatCuaCaSi(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const goiYCaSi = async (req, res, next) => {
    try {
        let data = await userService.goiYCaSi(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layCaSiById = async (req, res, next) => {
    try {
        let data = await userService.layCaSiById(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const timKiemBaiHat = async (req, res, next) => {
    try {
        let data = await userService.timKiemBaiHat(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const timKiemCaSi = async (req, res, next) => {
    try {
        let data = await userService.timKiemCaSi(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const doiTenDanhSach = async (req, res, next) => {
    try {
        let data = await userService.doiTenDanhSach(req.query, req.payload);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const doiViTriBaiHatTrongDS = async (req, res, next) => {
    try {
        let data = await userService.doiViTriBaiHatTrongDS(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layDanhSachThongBao = async (req, res, next) => {
    try {
        let data = await userService.layDanhSachThongBao(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const toggleYeuThichBaiHat = async (req, res, next) => {
    try {
        let data = await userService.toggleYeuThichBaiHat(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const kiemTraYeuThichBaiHat = async (req, res, next) => {
    try {
        let data = await userService.kiemTraYeuThichBaiHat(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layDanhSachBaiHatYeuThich = async (req, res, next) => {
    try {
        let data = await userService.layDanhSachBaiHatYeuThich(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const toggleQuanTamCaSi = async (req, res, next) => {
    try {
        let data = await userService.toggleQuanTamCaSi(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const layDanhSachCaSiQuanTam = async (req, res, next) => {
    try {
        let data = await userService.layDanhSachCaSiQuanTam(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const kiemTraQuanTamCaSi = async (req, res, next) => {
    try {
        let data = await userService.kiemTraQuanTamCaSi(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListRandomBaiHat = async (req, res, next) => {
    try {
        let data = await userService.getListRandomBaiHat(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const addCommentParent = async (req, res, next) => {
    try {
        let data = await userService.addCommentParent(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const addCommentChild = async (req, res, next) => {
    try {
        let data = await userService.addCommentChild(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const toggleLikeComment = async (req, res, next) => {
    try {
        let data = await userService.toggleLikeComment(
            req.body,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListCommentByIdBaiHat = async (req, res, next) => {
    try {
        let data = await userService.getListCommentByIdBaiHat(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const getListIdLikeComment = async (req, res, next) => {
    try {
        let data = await userService.getListIdLikeComment(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const tangViewBaiHat = async (req, res, next) => {
    try {
        let data = await userService.tangViewBaiHat(
            req.query,
            req.payload
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};


const getGoiYMVBaiHat = async (req, res, next) => {
    try {
        let data = await userService.getGoiYMVBaiHat(
            req.query
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};
const timKiemMV = async (req, res, next) => {
    try {
        let data = await userService.timKiemMV(
            req.query
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const testWebsocket = async (req, res, next) => {
    try {
        let data = await userService.testWebsocket(
            req.query
        );

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const checkLoginUser = async (req, res, next) => {
    try {

        return res.status(200).json({
            errCode: 0,
            errMessage: 'OK',
        });
    } catch (e) {
        next(e);
    }
};


const themTuThuong = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.themTuThuong(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const themTuDie = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.themTuDie(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const themTraLoi = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.themTraLoi(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const timTuGoiY = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.timTuGoiY(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const xoaTu = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.xoaTu(req.body);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const updateTuDien = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.updateTuDien(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};

const trainingData = async (req, res, next) => {
    try {
        //call service data
        let data = await userService.trainingData(req.query);

        return res.status(200).json(data);
    } catch (e) {
        next(e);
    }
};




module.exports = {
    CreateUser,
    verifyCreateUser,
    userLogin,
    refreshToken,
    getUserLogin,
    verifyEmail,
    accountVerifyPage,
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
    checkLoginUser,
    themTuThuong,
    themTuDie,
    themTraLoi,
    timTuGoiY,
    xoaTu,
    updateTuDien,
    trainingData
};
