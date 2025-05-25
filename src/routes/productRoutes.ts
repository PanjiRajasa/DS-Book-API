import express, { Request, Response, IRouter } from "express";
import { db } from "../firebase";

const router: IRouter = express.Router();   

//GET products
router.get("/", async (req, res): Promise<void> => {
  try {
    const snapshot = await db.collection('products').get(); //get the products collection

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })); //map the product

    res.status(200).json(products); //send the response as a JSON also with 200 code
  } catch(err) {
    console.error(err); //display the error
    res.status(500).json({ error: 'Failed to fetch products.' }); //server error handling
  }
});

//GET detail products
router.get("/:productId", async (req, res): Promise<void> => {
  const {productId} = req.params; //Get the productId string query

  try {
    const doc = await db.collection("products").doc(productId).get(); //get the products collection data based on the ID

    //if the prodcut did not exist (wrong ID)
    if(!doc.exists) {
      
      res.status(404).json({error: "Product not found"}); //return 404 and error message

    } else {

      const productData = doc.data(); //get the products data
      res.status(200).json(productData); //return 200 and display the data as JSON

    }

  } catch (error) {

    console.error(error); //display the error message
    res.status(500).json({ error: "Failed to fetch product" }); //return 500 (error from server)

  }
});

//POST products
router.post('/', async (req, res) => {
  try {
    const { name, image, description, summary, price } = req.body; //data from req.body

    //null checking
    if (!name || !image || !description || !summary || !price) {
      res.status(400).json({ message: 'Please insert all data' });
    }

    //new data
    const newProduct = {
      name,
      image,
      description,
      summary,
      price,
      createdAt: new Date(),
    };

    const docRef = await db.collection('products').add(newProduct); //add new document to the collection

    res.status(201).json({ message: 'Product created', id: docRef.id }); //success message

  } catch (error) {

    //error handling and send 500 code
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error' });

  }
});

//PUT products
router.put("/:productId", async (req, res): Promise<any> => {
  const { productId } = req.params;
  const { name, price, description, summary, image } = req.body;

  if (!productId) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    // Buat objek data yang akan diupdate
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (description) updateData.description = description;
    if (summary !== undefined) updateData.summary = summary;
    if (image) updateData.image = image;

    await db.collection("products").doc(productId).update(updateData);

    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

export default router;