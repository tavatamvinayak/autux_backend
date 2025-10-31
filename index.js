require('dotenv').config({
})
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const compression = require('compression');
const Item = require('./models/Item');
const User = require('./models/User');
const auth = require('./middleware/auth');

const NodeCache = require( "node-cache" );
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

const app = express();
const Port = process.env.PORT || 8080;

app.use(cors({
  origin:"*"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());


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
    const token = jwt.sign({ userId: user._id }, 'Autux_team_VT', { expiresIn: '1h' });
    res.json({ token });
    console.log("login success")
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// // CREATE
// app.post('/api/items',auth,  async (req, res) => {
//   try {
//     const item = new Item(req.body);
//     await item.save();
//     res.status(201).json(item);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // READ ALL
// app.get('/api/items',  async (req, res) => {
//   try {
//     const items = await Item.find();
//     res.json(items);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // READ ONE
// app.get('/api/items/:id', async (req, res) => {
//   try {
//     const item = await Item.findById(req.params.id);
//     if (!item) return res.status(404).json({ error: 'Item not found' });
//     res.json(item);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // UPDATE
// app.put('/api/items/:id',auth, async (req, res) => {
//   try {
//     const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!item) return res.status(404).json({ error: 'Item not found' });
//     res.json(item);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // DELETE
// app.delete('/api/items/:id',auth, async (req, res) => {
//   try {
//     const item = await Item.findByIdAndDelete(req.params.id);
//     if (!item) return res.status(404).json({ error: 'Item not found' });
//     res.json({ message: 'Item deleted' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


// ----------  Helper: cache invalidation ----------
function invalidateItemCache(id) {
  // single item
  myCache.del(`item:${id}`);
  // also blow the list cache – it will be rebuilt on next request
  myCache.del('items:all');
}

// ----------  READ ALL (cached) ----------
app.get('/api/items', async (req, res) => {
  const cacheKey = 'items:all';

  // 1. Try cache first
  const cached = myCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const items = await Item.find().lean();          // .lean() → plain JS objects (faster)
    myCache.set(cacheKey, items, 60);                // cache for 60 seconds
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------  READ ONE (cached) ----------
app.get('/api/items/:id', async (req, res) => {
  const cacheKey = `item:${req.params.id}`;

  // 1. Try cache first
  const cached = myCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Item not found' });

    myCache.set(cacheKey, item, 120);                // cache for 2 minutes
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------  CREATE ----------
app.post('/api/items', auth, async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();

    // Invalidate list cache because a new item appeared
    myCache.del('items:all');

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------  UPDATE ----------
app.put('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Invalidate both the single-item cache and the list cache
    invalidateItemCache(req.params.id);

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------  DELETE ----------
app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Invalidate caches
    invalidateItemCache(req.params.id);

    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(Port, () => console.log('Server running on port ' + Port));