const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())

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
    await client.connect();

    // collection here
    const userCollection = client.db('summerCamp').collection('users')
    const classCollection = client.db('summerCamp').collection('classes')
    const instructorCollection = client.db('summerCamp').collection('instructors')


    // admin check 




    // instructor check


    // user collection work here
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
    // all classes show to classes page
    app.get('/classes', async(req, res)=>{
      const result = await classCollection.find().toArray()
      res.send(result)
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