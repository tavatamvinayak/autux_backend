require('dotenv').config({
})
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Item = require('./models/Item');
const User = require('./models/User');
const auth = require('./middleware/auth');


const app = express();
const Port = process.env.PORT || 8080;

app.use(cors({
  origin:"*"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


async function dbconnect(){
  await  mongoose.connect( "mongodb+srv://vishaltavatam_db_user:vishaltavatam@cluster0.1liokc6.mongodb.net/autux?appName=Cluster0" || process.env.MONGO_URL )
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));
}
dbconnect()


app.get('/', (req, res) => {
  res.send('Autux Backend Working');
});





// SIGNUP
// app.post('/api/signup', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = new User({ email, password });
//     await user.save();
//     const token = jwt.sign({ userId: user._id }, 'Autux_team_VT');
//     res.status(201).json({ token });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// LOGIN
app.post('/api/login', async (req, res) => {
  console.log("login route")
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, 'Autux_team_VT');
    res.json({ token });
    console.log("login success")
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE
app.post('/api/items',auth,  async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ ALL
app.get('/api/items',  async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ ONE
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
app.put('/api/items/:id',auth, async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE
app.delete('/api/items/:id',auth, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(Port, () => console.log('Server running on port ' + Port));