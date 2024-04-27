import db from '../../models'
const { Op } = require("sequelize");

const ListTypeProducts = async () => {
    let data = await db.typeProduct.findAll();
    return data
}

const ListTrademarks = async () => {
    let data = await db.trademark.findAll();
    return data
}

const ListProducts = async () => {
    let data = await db.product.findAll();
    return data
}

const ListImageProducts = async () => {
    let data = await db.imageProduct.findAll({
        order: [['STTImage', 'ASC']]
    });
    return data
}

const ListClassify = async () => {
    let data = await db.classifyProduct.findAll({
        order: [['STTImg', 'ASC']]
    });
    return data
}

const ListPromotions = async () => {
    let data = await db.promotionProduct.findAll();
    return data
}

const listEvaluates = async () => {
    let data = await db.evaluateProduct.findAll();
    return data
}

const productSearch = async () => {
    let data = await db.product.findAll({
        include: [
            {
                model: db.typeProduct,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            },
            {
                model: db.trademark,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            },
        ],
        raw: false,
        nest: true
    });
    return data
}

const listBills = async () => {
    let data = await db.bill.findAll({
        order: [
            ['payment', 'ASC'],
            ['createdAt', 'DESC']
        ]
    });
    return data
}

const listDetailBills = async () => {
    let data = await db.detailBill.findAll();
    return data
}

const listAddressUser = async () => {
    let data = await db.addressUser.findAll();
    return data
}

const listImageEvaluate = async () => {
    let data = await db.imageEvaluateProduct.findAll();
    return data
}

const listVideoEvaluate = async () => {
    let data = await db.videoEvaluateProduct.findAll();
    return data
}

const ListTrademarkSearch = async () => {
    let data = await db.trademark.findAll({
        include: [
            {
                model: db.product,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            },
            {
                model: db.typeProduct,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            }
        ],
        raw: false,
        nest: true
    });
    return data
}


const ListTypeProductSearch = async () => {
    let data = await db.typeProduct.findAll({
        include: [
            {
                model: db.product,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            },
            {
                model: db.trademark,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }
            }
        ],
        raw: false,
        nest: true
    });
    return data
}

const listKeywordService = async (keyword) => {
    let listKeyword = await db.keywordSearchs.findAll({
        limit: 20,
        where: {
            keyword: {
                [Op.startsWith]: keyword.toLowerCase()
            }
        },
        order: [
            ['keyword', 'asc'],
            // ['amount', 'DESC']
        ],
        raw: false
    })

    return listKeyword
}

const listBlog = async () => {
    let data = await db.blogs.findAll({
        order: [['stt', 'DESC']]
    });
    return data
}

module.exports = {
    ListTypeProducts,
    ListTrademarks,
    ListProducts,
    ListImageProducts,
    ListClassify,
    ListPromotions,
    listEvaluates,
    productSearch,
    listBills,
    listDetailBills,
    listAddressUser,
    listImageEvaluate,
    listVideoEvaluate,
    ListTrademarkSearch,
    ListTypeProductSearch,
    listKeywordService,
    listBlog
}