import { route } from "plumier"

export class HomeController {
    @route.get("/")
    index() {
        return "Hello world"
    }
}