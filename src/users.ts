import { model, collection } from "@plumier/mongoose"
import bcrypt from "bcrypt"
import { authorize, route, val } from "plumier"
import { censor } from "./audit";

// --------------------------------------------------------------------- //
// ------------------------------- DOMAIN ------------------------------ //
// --------------------------------------------------------------------- //

@collection()
export class User {
    static censor(user: User) {
        return <User>{ ...user, password: "***********", email: "***********" }
    }

    constructor(
        @val.email()
        //@val.unique()
        public email: string,
        public password: string,
        public name: string,
        @authorize.role("Admin")
        public role: "User" | "Admin"
    ) { }
}


const UserModel = model(User)


// --------------------------------------------------------------------- //
// ----------------------------- CONTROLLER ---------------------------- //
// --------------------------------------------------------------------- //

export class UsersController {

    @censor((x: User) => User.censor(x))
    @route.post("")
    async save(data: User) {
        const password = await bcrypt.hash(data.password, 10)
        return new UserModel({ ...data, password, role: "User" }).save()
    }

    @route.get("")
    list(offset: number, limit: number) {
        return UserModel.find().limit(limit).skip(offset)
    }

    @route.get(":id")
    get(@val.mongoId() id: string) {
        return UserModel.findById(id)
    }

    @censor((id: number, x: User) => ([id, User.censor(x)]))
    @route.put(":id")
    async modify(@val.mongoId() id: string, data: User) {
        const password = await bcrypt.hash(data.password, 10)
        return UserModel.findByIdAndUpdate(id, { ...data, password })
    }

    @route.delete(":id")
    delete(@val.mongoId() id: string) {
        return UserModel.findByIdAndDelete(id)
    }
}