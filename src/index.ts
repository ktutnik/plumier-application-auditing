import Plumier, { WebApiFacility } from "plumier"
import { JwtAuthFacility } from "@plumier/jwt"
import { sign } from "jsonwebtoken"

import { AuditFacility } from "./audit"
import { MongooseFacility } from "@plumier/mongoose";

const port = 8000;
const jwtSecret = "very secret"

new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .set(new JwtAuthFacility({ secret: jwtSecret }))
    .set(new AuditFacility())
    .set(new MongooseFacility({ uri: "mongodb://localhost:27017/auditing", model: __dirname }))
    .initialize()
    .then(x => x.listen(port))
    .then(x => console.log(`Server running http://localhost:${port}/`))
    .catch(e => console.error(e))


//generate example user claim for testing
const token = sign({ userId: "54759eb3c090d83494e2d804" }, jwtSecret)
console.log()
console.log("Bearer", token)


