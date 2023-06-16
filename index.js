const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())

//  console.log(process.env.ACCESS_TOKEN_SECRET);

// will write verify jwt out of mongodb
const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    res.status(401).send({error: true, message: 'Unauthorized Credentials'})
  }

  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized credential'})
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gqha5r5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //this line might create problem
    // await client.connect();

    // collection here
    const userCollection = client.db('summerCamp').collection('users')
    const classCollection = client.db('summerCamp').collection('classes')
    const instructorCollection = client.db('summerCamp').collection('instructors')

    const studentAddedClassCollection = client.db('summerCamp').collection('studentAddedClass')

    const enrolledClassesCollection = client.db('summerCamp').collection('enrolledClass')


    // verify admin
    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await userCollection.findOne(query)
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden response'})
      }
      next()
    }

    // instructor check


  
    // user collection work here
    app.get('/users', verifyJWT, verifyAdmin, async(req, res) =>{
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    // checking if usr is admin
     // security layer 1: verify jwt
    app.get('/users/admin/:email', verifyJWT, async(req, res) =>{
      const email = req.params.email;
      // second secure layer
      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query = {email: email}
      const user = await userCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    // instructor check
    app.get('/users/instructor/:email', verifyJWT, async(req, res) =>{
      const email = req.params.email;
      // second secure layer
      if(req.decoded.email !== email){
        res.send({instructor: false})
      }
      const query = {email: email}
      const user = await userCollection.findOne(query)
      const result = {instructor: user?.role === 'instructor'}
      res.send(result)
    })

    // updating user into different things(this will done by admin)



    // create user in mongo
    app.post('/users', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'User is Existing'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })
    
    //-------
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })


    // --------------------------------

    // classes collection
    // all classes show to classes page (teacher added class)
    app.get('/approvedclasses', async(req, res)=>{
      const result = await classCollection.find({ pendingStatus: 'approved' }).toArray()
      res.send(result)
    })

    // get classes by email by an instructor
    app.get('/classes', async(req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([]);
        return;
      }

      const query = {email: email};
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    // added class by instructor
    app.post('/instructoraddclass', async(req, res)=>{
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result)
    })


    // student added class connection here
    // ----cart collection
    app.post('/studentclass', async(req, res)=>{
      const item = req.body;
      const result = await studentAddedClassCollection.insertOne(item);
      res.send(result)
    })

    app.get('/studentclass', verifyJWT, async(req, res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        res.status(403).send({error: true, message: 'forbidded'})
      }

      const query = {email: email}
      const result = await studentAddedClassCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/studentclass/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await studentAddedClassCollection.deleteOne(query);
      res.send(result)
    })



    // enrolled class work
    // set all the enroll class details as well email then get it with email



    // --payment related
     //-create  payment intent
     app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // instructors get operation
    app.get('/instructors', async(req, res)=>{
      const result = await instructorCollection.find().toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//---------------------------------------------
app.get('/', (req, res)=>{
    res.send('Summer camp server is running')
})

app.listen(port, ()=>{
    console.log(`App is Running on ${port}`);
})