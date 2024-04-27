import {
    ListTypeProducts, ListTrademarks, ListProducts, ListImageProducts,
    ListClassify, ListPromotions, listEvaluates, productSearch,
    listBills, listDetailBills,
    listAddressUser, listImageEvaluate, listVideoEvaluate,
    ListTrademarkSearch, ListTypeProductSearch,
    listKeywordService, listBlog

} from '../data/rest'
import FuzzySearch from 'fuzzy-search';


// let products
// let listtrademarks
// let listimageproduct
// let listclassify
// let listpromotions
// let listevaluates

// async function initList() {






// }
// initList();

const resolvers = {
    //QUERY
    Query: {
        typeproducts: () => {
            return Listtypeproducts
        },
        typeproduct: (parent, args) => {
            return Listtypeproducts.find(item => item.id === +args.id)
        },
        products: async (parent, args) => {
            let products = await ListProducts();
            return products
        },
        product: async (parent, args) => {
            let products = await ListProducts();
            return products.find(item => item.id === args.id)
        },
        searchProduct: async (parent, args) => {
            let products = await productSearch();

            const searcher = new FuzzySearch(products, ['nameProductEn', 'typeProduct.nameTypeProductEn', 'trademark.nameTrademarkEn'], {
                caseSensitive: false,
                sort: true
            });
            let key = args.keyword.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');

            const result = searcher.search(key);

            return result
        },

        listBillByType: async (parent, args) => {
            let listBill = await listBills();
            return listBill.filter(item => item.idStatusBill === args.type)
        },
        BillById: async (parent, args) => {
            let listBill = await listBills();
            return listBill.find(item => item.id === args.id)
        },
        detailBillById: async (parent, args) => {
            let list = await listDetailBills();
            return list.find(item => item.id === args.id)
        },
        listTrademarkSearch: async (parent, args) => {
            let list = await ListTrademarkSearch();
            if (args.keyword === 'all')
                return list

            const searcher = new FuzzySearch(list, ['nameTrademarkEn', 'typeProduct.nameTypeProductEn', 'products.nameProductEn'], {
                caseSensitive: false,
                sort: true
            });
            let key = args.keyword.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');

            const result = searcher.search(key);


            return result
        },
        listTypeProductSearch: async (parent, args) => {
            let list = await ListTypeProductSearch();
            if (args.keyword === 'all')
                return list

            const searcher = new FuzzySearch(list, ['nameTypeProductEn', 'trademark.nameTrademarkEn', 'products.nameProductEn'], {
                caseSensitive: false,
                sort: true
            });
            let key = args.keyword.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');

            const result = searcher.search(key);


            return result
        },
        listKeyword: async (parent, args) => {
            let list = await listKeywordService(args.keyword);
            return list
        },
        blog: async (parent, args) => {
            let list = await listBlog();
            return list.find(item => item.id === args.Id)
        },
    },
    product: {
        typeProduct: async (parent, args) => {
            let Listtypeproducts = await ListTypeProducts();
            return Listtypeproducts.find(item => item.id === parent.idTypeProduct)
        },
        trademark: async (parent, args) => {
            let listtrademarks = await ListTrademarks();
            return listtrademarks.find(item => item.id === parent.idTrademark)
        },
        imageProduct: async (parent, args) => {
            let listimageproduct = await ListImageProducts();
            return listimageproduct.filter(item => item.idProduct === parent.id)
        },
        classifyProduct: async (parent, args) => {
            let listclassify = await ListClassify();
            return listclassify.filter(item => item.idProduct === parent.id)
        },
        promotionProduct: async (parent, args) => {
            let listpromotions = await ListPromotions();
            return listpromotions.find(item => item.idProduct === parent.id)
        },
        countEvaluate: async (parent, args) => {
            let listevaluates = await listEvaluates();
            let data = listevaluates.filter(item => item.idProduct === parent.id);
            return data.length
        },
        persentElevate: async (parent, args) => {
            let listevaluates = await listEvaluates();
            let data = listevaluates.filter(item => item.idProduct === parent.id);
            if (data.length === 0) return 0

            let sum = data.reduce((init, item) => {
                return init + item.starNumber
            }, 0)

            return sum / data.length;
        },

    },
    bill: {
        detailBill: async (parent, args) => {
            let listDetailBill = await listDetailBills();
            return listDetailBill.filter(item => item.idBill === parent.id)
        },
        addressUser: async (parent, args) => {
            let listAddressUsers = await listAddressUser();
            return listAddressUsers.find(item => item.id == parent.idAddressUser)
        },
    },
    detailBill: {
        classifyProduct: async (parent, args) => {
            let listclassifys = await ListClassify();
            return listclassifys.find(item => item.id === parent.idClassifyProduct)
        },
        product: async (parent, args) => {
            let ListProduct = await ListProducts();
            return ListProduct.find(item => item.id === parent.idProduct.toLowerCase())
        },
        evaluateProduct: async (parent, args) => {
            let List = await listEvaluates();
            return List.find(item => item.idDetailBill === parent.id)
        },
    },
    evaluateProduct: {
        imageEvaluateProduct: async (parent, args) => {
            let list = await listImageEvaluate();
            return list.filter(item => item.idEvaluateProduct === parent.id)
        },
        videoEvaluateProduct: async (parent, args) => {
            let list = await listVideoEvaluate();
            return list.find(item => item.idEvaluateProduct === parent.id)
        },
    },
    trademark: {
        product: async (parent, args) => {
            let list = await ListProducts();
            return list.filter(item => item.idTrademark === parent.id)
        },
    }



    // //MUTATION
    // Mutation: {
    //     createAuthor: (parent, args) => args
    // }
}

module.exports = resolvers