import express from 'express';
import userController from '../controllers/userController';
import multer from 'multer';
import path from 'path';
import { routes } from '../services/commont';
import { verifyAccessToken } from '../helpers/JWT_service';

const fileUploader = require('../config/cloudinary.config');
import cloudinary_evaluate from '../utils/cloudinary/cloudinary_evaluate';
import cloudinary_blog from '../utils/cloudinary/cloudinary_blog';
import cloudinary_shortvideo from '../utils/cloudinary/cloudinary_shortvideo';
import cloudinary_shortvideo_video from '../utils/cloudinary/cloudinary_shortvideo_video';
import cloudinary_avatar from '../utils/cloudinary/cloudinary_avatar';



let router = express.Router();

let appRoot = require('app-root-path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, appRoot + '/src/public/videoTam/');
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + '-' + Date.now() + path.extname(file.originalname)
        );
    },
});

let upload = multer({
    storage,
    limits: { fileSize: 104857600 },
});

const initUserRoute = (app) => {
    //user api
    router.get('/', (req, res) => {
        res.send('Hello backend')
    }
    );
    router.get('/cancel', (req, res) =>
        res.send('Cancelled (Đơn hàng đã hủy)')
    );

    router.get(
        "/view/youtube",
        (req, res) => {

            res.sendFile(appRoot + '/src/views/youtube.html');
        }
    );

    router.get(
        "/view/control-music",
        (req, res) => {
            // console.log('approot: ', appRoot);
            res.render('controlMusic.ejs');
        }
    );

    router.get(
        routes.getUserLogin,
        verifyAccessToken,
        userController.getUserLogin
    );
    router.get(
        routes.getAddressUser,
        verifyAccessToken,
        userController.getAddressUser
    );
    router.get(
        routes.getListCartUser,
        verifyAccessToken,
        userController.getListCartUser
    );
    router.get(
        routes.getUserLoginRefreshToken,
        userController.getUserLoginRefreshToken
    );
    router.get(
        routes.getListBillByType,
        verifyAccessToken,
        userController.getListBillByType
    );
    router.get(
        routes.getBlogEditById,
        verifyAccessToken,
        userController.getBlogEditById
    );
    router.get(
        routes.getListBlogUserByPage,
        verifyAccessToken,
        userController.getListBlogUserByPage
    );
    router.get(
        routes.getShortVideoById,
        verifyAccessToken,
        userController.getShortVideoById
    );
    router.get(
        routes.buyProductByCardSucess,
        userController.buyProductByCardSucess
    );
    router.get(routes.getListBlogByIdUser, userController.getListBlogByIdUser);
    router.get(
        routes.getListCollectionBlogUserByPage,
        verifyAccessToken,
        userController.getListCollectionBlogUserByPage
    );
    router.get(
        routes.checkUserLikeShortVideo,
        verifyAccessToken,
        userController.checkUserLikeShortVideo
    );
    router.get(
        routes.CheckSaveCollectionShortVideo,
        verifyAccessToken,
        userController.CheckSaveCollectionShortVideo
    );
    router.get(
        routes.getListVideoByIdUser,
        userController.getListVideoByIdUser
    );
    router.get(routes.getUserById, userController.getUserById);
    router.get(
        routes.checkLikeBlogById,
        verifyAccessToken,
        userController.checkLikeBlogById
    );
    router.get(
        routes.checkSaveBlogById,
        verifyAccessToken,
        userController.checkSaveBlogById
    );
    router.get(
        routes.getListNotifyAll,
        verifyAccessToken,
        userController.getListNotifyAll
    );
    router.get(
        routes.getListNotifyByType,
        verifyAccessToken,
        userController.getListNotifyByType
    );
    router.get(
        routes.getBillById,
        verifyAccessToken,
        userController.getBillById
    );
    router.get(
        routes.getDetailBillById,
        verifyAccessToken,
        userController.getDetailBillById
    );
    router.get(
        routes.layDanhSachPhat,
        verifyAccessToken,
        userController.layDanhSachPhat
    );

    router.get(
        routes.layBaiHatTrongDanhSach,
        verifyAccessToken,
        userController.layBaiHatTrongDanhSach
    );

    router.get(
        routes.layBaiHatCuaCaSi,
        // verifyAccessToken,
        userController.layBaiHatCuaCaSi
    );

    router.get(routes.goiYCaSi, verifyAccessToken, userController.goiYCaSi);
    router.get(
        routes.layCaSiById,
        // verifyAccessToken,
        userController.layCaSiById
    );

    router.get(
        routes.timKiemBaiHat,
        // verifyAccessToken,
        userController.timKiemBaiHat
    );

    router.get(
        routes.timKiemCaSi,
        // verifyAccessToken,
        userController.timKiemCaSi
    );

    router.get(
        routes.layDanhSachThongBao,
        verifyAccessToken,
        userController.layDanhSachThongBao
    );

    router.get(
        routes.kiemTraYeuThichBaiHat,
        verifyAccessToken,
        userController.kiemTraYeuThichBaiHat
    );

    router.get(
        routes.layDanhSachBaiHatYeuThich,
        verifyAccessToken,
        userController.layDanhSachBaiHatYeuThich
    );

    router.get(
        routes.layDanhSachCaSiQuanTam,
        verifyAccessToken,
        userController.layDanhSachCaSiQuanTam
    );

    router.get(
        routes.kiemTraQuanTamCaSi,
        verifyAccessToken,
        userController.kiemTraQuanTamCaSi
    );

    router.get(
        routes.getListRandomBaiHat,
        // verifyAccessToken,
        userController.getListRandomBaiHat
    );

    router.get(
        routes.getListCommentByIdBaiHat,
        verifyAccessToken,
        userController.getListCommentByIdBaiHat
    );

    router.get(
        routes.getListIdLikeComment,
        verifyAccessToken,
        userController.getListIdLikeComment
    );

    router.get(
        routes.checkLoginUser,
        verifyAccessToken,
        userController.checkLoginUser
    );

    router.get(
        routes.getGoiYMVBaiHat,
        userController.getGoiYMVBaiHat
    );

    router.get(
        routes.timKiemMV,
        userController.timKiemMV
    );

    router.get(
        routes.testWebsocket,
        userController.testWebsocket
    );



    router.post(routes.CreateUser, userController.CreateUser);
    router.post(routes.verifyCreateUser, userController.verifyCreateUser);
    router.post(routes.userLogin, userController.userLogin);
    router.post(routes.refreshToken, userController.refreshToken);
    router.post(routes.loginGoogle, userController.loginGoogle);
    router.post(routes.loginFacebook, userController.loginFacebook);
    router.post(routes.loginGithub, userController.loginGithub);
    router.post(
        routes.addProductToCart,
        verifyAccessToken,
        userController.addProductToCart
    );
    router.post(
        routes.addCartOrMoveCart,
        verifyAccessToken,
        userController.addCartOrMoveCart
    );
    router.post(
        routes.addNewAddressUser,
        verifyAccessToken,
        userController.addNewAddressUser
    );
    router.post(
        routes.createNewBill,
        verifyAccessToken,
        userController.createNewBill
    );
    router.post(
        routes.userRepurchaseBill,
        verifyAccessToken,
        userController.userRepurchaseBill
    );
    router.post(routes.checkKeyVerify, userController.checkKeyVerify);
    router.post(
        routes.buyProductByCard,
        verifyAccessToken,
        userController.buyProductByCard
    );
    router.post(
        routes.createNewEvaluateProduct,
        verifyAccessToken,
        userController.createNewEvaluateProduct
    );
    router.post(
        routes.uploadImagesEvaluateProduct,
        cloudinary_evaluate.array('file'),
        userController.uploadImagesEvaluateProduct
    );
    router.post(
        routes.updateVideoEvaluate,
        upload.single('video'),
        userController.updateVideoEvaluate
    );
    router.post(
        routes.createNewBlog,
        verifyAccessToken,
        userController.createNewBlog
    );
    router.post(
        routes.createNewImageBlog,
        cloudinary_blog.array('file'),
        userController.createNewImageBlog
    );
    router.post(
        routes.uploadVideoNewBlog,
        upload.single('video'),
        userController.uploadVideoNewBlog
    );
    router.post(
        routes.uploadVideoEvaluateProduct,
        upload.single('video'),
        userController.uploadVideoEvaluateProduct
    );
    router.post(
        routes.shareProduct,
        verifyAccessToken,
        userController.shareProduct
    );
    router.post(routes.shareBlog, verifyAccessToken, userController.shareBlog);
    router.post(
        routes.toggleLikeBlog,
        verifyAccessToken,
        userController.toggleLikeBlog
    );
    router.post(
        routes.createNewCommentBlog,
        verifyAccessToken,
        userController.createNewCommentBlog
    );
    router.post(
        routes.createNewShortVideo,
        verifyAccessToken,
        userController.createNewShortVideo
    );
    router.post(
        routes.uploadCoverImageShortVideo,
        cloudinary_shortvideo.single('file'),
        userController.uploadCoverImageShortVideo
    );
    router.post(
        routes.uploadVideoForShortVideo,
        upload.single('video'),
        userController.uploadVideoForShortVideo
    );
    router.post(
        routes.saveBlogCollection,
        verifyAccessToken,
        userController.saveBlogCollection
    );
    router.post(
        routes.createCommentShortVideo,
        verifyAccessToken,
        userController.createCommentShortVideo
    );
    router.post(
        routes.toggleLikeShortVideo,
        verifyAccessToken,
        userController.toggleLikeShortVideo
    );
    router.post(
        routes.saveCollectionShortVideo,
        verifyAccessToken,
        userController.saveCollectionShortVideo
    );
    router.post(
        routes.sendEmailFromContact,
        userController.sendEmailFromContact
    );
    router.post(
        routes.createNewReportVideo,
        verifyAccessToken,
        userController.createNewReportVideo
    );
    router.post(
        routes.createNewReportBlog,
        verifyAccessToken,
        userController.createNewReportBlog
    );
    router.post(routes.createNewUserMobile, userController.createNewUserMobile);
    router.post(
        routes.themDanhSachPhat,
        verifyAccessToken,
        userController.themDanhSachPhat
    );
    router.post(
        routes.themBaiHatVaoDanhSach,
        verifyAccessToken,
        userController.themBaiHatVaoDanhSach
    );
    router.post(
        routes.toggleYeuThichBaiHat,
        verifyAccessToken,
        userController.toggleYeuThichBaiHat
    );
    router.post(
        routes.toggleQuanTamCaSi,
        verifyAccessToken,
        userController.toggleQuanTamCaSi
    );

    router.post(
        routes.addCommentParent,
        verifyAccessToken,
        userController.addCommentParent
    );

    router.post(
        routes.addCommentChild,
        verifyAccessToken,
        userController.addCommentChild
    );

    router.post(
        routes.toggleLikeComment,
        verifyAccessToken,
        userController.toggleLikeComment
    );

    router.put(
        routes.setDefaultAddress,
        verifyAccessToken,
        userController.setDefaultAddress
    );
    router.put(
        routes.editAddressUser,
        verifyAccessToken,
        userController.editAddressUser
    );
    router.put(
        routes.editAmountCartUser,
        verifyAccessToken,
        userController.editAmountCartUser
    );
    router.put(
        routes.chooseProductInCart,
        verifyAccessToken,
        userController.chooseProductInCart
    );
    router.put(
        routes.updateClassifyProductInCart,
        verifyAccessToken,
        userController.updateClassifyProductInCart
    );
    router.put(
        routes.chooseAllProductInCart,
        verifyAccessToken,
        userController.chooseAllProductInCart
    );
    router.put(
        routes.userCancelBill,
        verifyAccessToken,
        userController.userCancelBill
    );
    router.put(
        routes.getCodeVeridyForgetPass,
        userController.getCodeVeridyForgetPass
    );
    router.put(routes.changePassForget, userController.changePassForget);
    router.put(
        routes.hasReceivedProduct,
        verifyAccessToken,
        userController.hasReceivedProduct
    );
    router.put(
        routes.updataEvaluateProduct,
        verifyAccessToken,
        userController.updataEvaluateProduct
    );
    router.put(
        routes.updateProfileUser,
        verifyAccessToken,
        userController.updateProfileUser
    );
    router.put(
        routes.updateAvatarUser,
        cloudinary_avatar.single('file'),
        verifyAccessToken,
        userController.updateAvatarUser
    );
    router.put(
        routes.getConfirmCodeChangePass,
        userController.getConfirmCodeChangePass
    );
    router.put(
        routes.confirmCodeChangePass,
        userController.confirmCodeChangePass
    );
    router.put(routes.updateBlog, verifyAccessToken, userController.updateBlog);
    router.put(
        routes.updateShortVideoById,
        verifyAccessToken,
        userController.updateShortVideoById
    );
    router.put(
        routes.editContentBlogUserById,
        verifyAccessToken,
        userController.editContentBlogUserById
    );
    router.put(
        routes.updateCommentBlogById,
        verifyAccessToken,
        userController.updateCommentBlogById
    );
    router.put(
        routes.editCommentShortVideoById,
        verifyAccessToken,
        userController.editCommentShortVideoById
    );
    router.put(
        routes.seenNotifyOfUser,
        verifyAccessToken,
        userController.seenNotifyOfUser
    );
    router.put(
        routes.verifyCodeForCreateUserMobile,
        userController.verifyCodeForCreateUserMobile
    );
    router.put(
        routes.doiTenDanhSach,
        verifyAccessToken,
        userController.doiTenDanhSach
    );

    router.put(
        routes.doiViTriBaiHatTrongDS,
        verifyAccessToken,
        userController.doiViTriBaiHatTrongDS
    );

    router.put(
        routes.tangViewBaiHat,
        verifyAccessToken,
        userController.tangViewBaiHat
    );

    router.delete(
        routes.deleteAddressUser,
        verifyAccessToken,
        userController.deleteAddressUser
    );
    router.delete(
        routes.deleteVideoEvaluate,
        userController.deleteVideoEvaluate
    );
    router.delete(
        routes.deleteProductInCart,
        verifyAccessToken,
        userController.deleteProductInCart
    );
    router.delete(
        routes.createNewEvaluateProductFailed,
        userController.createNewEvaluateProductFailed
    );
    router.delete(
        routes.deleteBlogUserById,
        verifyAccessToken,
        userController.deleteBlogUserById
    );
    router.delete(
        routes.deleteCommentBlogById,
        verifyAccessToken,
        userController.deleteCommentBlogById
    );
    router.delete(
        routes.deleteCollectBlogById,
        verifyAccessToken,
        userController.deleteCollectBlogById
    );
    router.delete(
        routes.deleteCommentShortVideoById,
        verifyAccessToken,
        userController.deleteCommentShortVideoById
    );
    router.delete(
        routes.deleteShortVideoById,
        verifyAccessToken,
        userController.deleteShortVideoById
    );
    router.delete(
        routes.xoaBaiHatKhoiDanhSach,
        verifyAccessToken,
        userController.xoaBaiHatKhoiDanhSach
    );
    router.delete(
        routes.xoaDanhSachPhat,
        verifyAccessToken,
        userController.xoaDanhSachPhat
    );


    // noi tu api
    router.post(
        "/them-tu-thuong",
        userController.themTuThuong
    );

    router.post(
        "/them-tu-die",
        userController.themTuDie
    );

    router.post(
        "/them-tra-loi",
        userController.themTraLoi
    );

    router.post(
        "/xoa-tu",
        userController.xoaTu
    );

    router.get(
        "/tim-tu-goi-y",
        userController.timTuGoiY
    );

    router.get(
        "/update-tu-dien",
        userController.updateTuDien
    );

    router.get(
        "/tranning-data",
        userController.trainingData
    );


    return app.use('/', router);
};

export default initUserRoute;
