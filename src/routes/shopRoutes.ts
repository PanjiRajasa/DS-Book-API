import express, { Request, Response, IRouter } from "express";
import { db } from "../firebase";

const router: IRouter = express.Router(); 

//GET shops data
router.get("/", async (req, res): Promise<void> => {
  try {
    const snapshot = await db.collection('shop').get(); //get the shop collection

    const shop = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })); //map the shop

    res.status(200).json(shop); //send the response as a JSON also with 200 code

  } catch(err) {

    console.error(err); //display the error
    res.status(500).json({ error: 'Failed to fetch shop.' }); //server error handling

  }
});

//GET shops detail
router.get("/:shopId", async (req, res): Promise<void> => {
  const {shopId} = req.params; //Get the shopId string query

  try {
    const doc = await db.collection("shop").doc(shopId).get(); //get the shops collection data based on the ID

    //if the shop did not exist (wrong ID)
    if(!doc.exists) {
      
      res.status(404).json({error: "Shop not found"}); //return 404 and error message

    } else {

      const productData = doc.data(); //get the shop data
      res.status(200).json(productData); //return 200 and display the data as JSON

    }

  } catch (error) {

    console.error(error); //display the error message
    res.status(500).json({ error: "Failed to fetch shop" }); //return 500 (error from server)

  }
});

//POST shop data
router.post('/', async (req, res): Promise<void> => {
  try {
    const { name, address, image, detail, rate } = req.body; //data from req.body

    //null checking
    if (!address || !image || !detail || !name || !rate) {
      res.status(400).json({ message: 'Please insert all data' });
    }

    //new data
    const newProduct = {
      address,
      image,
      detail,
      name,
      rate,
      createdAt: new Date(),
    };

    const docRef = await db.collection('shop').add(newProduct); //add new document to the collection

    res.status(201).json({ message: 'Shop created', id: docRef.id }); //success message

  } catch (error) {

    //error handling and send 500 code
    console.error('Error creating shop:', error);
    res.status(500).json({ message: 'Internal server error' });

  }
});

//PUT shops
interface ShopParams{
    shopId: string
}

interface ShopBody {
    name: string,
    address: string,
    image: string,
    detail: string,
    rate: number
}

router.put("/:shopId", async (req: Request<ShopParams, any, ShopBody>, res: Response) : Promise<any> => {
    const {shopId} = req.params; //id from params
    const { name, address, image, detail, rate } = req.body; //data from req.body

    if(!shopId) {
        return res.status(400).json({ error: "Shop ID is required" });
    }

    try {
    // Buat objek data yang akan diupdate
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (detail) updateData.detail = detail;
    if (rate) updateData.rate = rate;
    if (image) updateData.image = image;

    await db.collection("shop").doc(shopId).update(updateData);

    res.status(200).json({ message: "Shop updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update shop" });
  }
})

export default router;