import { mongooseConnect } from "@/lib/mongoose";
import { Order } from "@/models/Order";
const stripe = require("stripe")(process.env.STRIPE_SK);
import {buffer} from "micro";

const endpointSecret = "whsec_5d81df3e294efda59521b2ecf000b5829638e7b2b3b86ab99fa1632f6a571797";

export default async function handler(req,res) {
    await mongooseConnect();
    const sig = req.headers["stripe-signature"];

    let event;
    
    try {
      event = stripe.webhooks.constructEvent(await buffer(req), sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const data = event.data.object;
        const orderId = data.metadata.orderId;
        const paid = data.payment_status === "paid";
        if (orderId && paid) {
          await Order.findByIdAndUpdate(orderId,{
            paid:true,
          })
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send("Ok");
}

export const config = {
    api: {bodyParser:false,}
};

// classy-neat-salute-glitz
// acct_1QWotoEiKYpRq0MF