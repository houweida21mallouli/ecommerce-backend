const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { log } = require("console");

app.use(express.json());
app.use(cors());

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://houweidamallouli:9mIqbFnTGfs7pNYK@cluster0.vgras.mongodb.net/e-commerce");
// password: 9mIqbFnTGfs7pNYK


// API Creation

app.get("/",(req,res)=>{
    res.send("Express App is running");
})

// Image storage engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// Creating upload endpoint for images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for creating products

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true, 
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true, 
    },
    category:{
        type:String,
        required:true, 
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    description:{
        type:String,
        required:true,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
        {
            let last_product_array = products.slice(-1);
            let last_product = last_product_array[0];
            id = last_product.id+1;
        }
        else{
            id=1;
        }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        description:req.body.description, 
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for deleting products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for getting all products
app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({});
    console.log("All products fetched");
    res.send(products);
})

// Schema creating for User model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// Creating Endpoint for registering the user
app.post('/signup',async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if (check) {
        return res.status(400).json({success:false,errors:"utilisateur existe déjà with same email address"})
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})

// Creating endpoint for user login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"mot de passe incorrect"});
        }
    }
    else{
        res.json({success:false,errors:"email incorrect"})
    }
})

// Creating endpoint for new collection data
app.get('/newcollections',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

// Creating endpoint for popular in chat section
app.get('/popularinchat',async (req,res)=>{
    let products = await Product.find({category:"chat"});
    let popular_in_chat = products.slice(0,4);
    console.log("Popular in chat fetched");
    res.send(popular_in_chat);
})

// Creating middleware to fetch user
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({errors:"please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
    }
}

// Creating endpoint for adding products in Cart
app.post('/addtocart',fetchUser,async (req,res)=>{
    console.log("ajouté",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] +=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Ajouté");
})

// Creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("supprimé",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Supprimé");
})

// Creating endpoint to get cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("getCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if(!error) {
        console.log("server running on port "+port)
    }
    else
    {
        console.log("Error : "+error)
    }
})


// new added code


// Other schemas...

const Order = mongoose.model('Order', {
    orderId: {
        type: Number,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    products: [{
        type: Object,
        required: true,
    }],
    total: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        default: 'Pending',
    }
});

// Creating endpoint to place an order
app.post('/createorder', fetchUser, async (req, res) => {
    let orders = await Order.find({});
    let orderId = orders.length ? orders.slice(-1)[0].orderId + 1 : 1;

    const newOrder = new Order({
        orderId,
        userId: req.user.id,
        products: req.body.products,
        total: req.body.total,
    });

    await newOrder.save();
    res.json({
        success: true,
        message: 'Order placed successfully!'
    });
});

// Creating endpoint to fetch all orders
app.get('/allorders', async (req, res) => {
    const orders = await Order.find({}).populate('userId', 'name email');
    res.json(orders);
});

