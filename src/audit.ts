import { collection, model } from "@plumier/mongoose"
import { Context } from "koa"
import { ActionResult, DefaultFacility, Invocation, Middleware, PlumierApplication } from "plumier"
import { decorateMethod } from "tinspector"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

interface AuditDecorator { type: "audit-censor", callback: (...args: any[]) => any }

export function censor(callback: (...args: any[]) => any) {
    return decorateMethod(<AuditDecorator>{ type: "audit-censor", callback })
}

function getDecorator(decorators: any[]): AuditDecorator | undefined {
    return decorators.find(x => x.type === "audit-censor")
}

// --------------------------------------------------------------------- //
// ------------------------------- DOMAIN ------------------------------ //
// --------------------------------------------------------------------- //


@collection()
export class Audit {
    static fromContext(context: Context, status: "Success" | "Error") {
        const { route, state, method:mtd, parameters } = context
        const method = mtd.toLowerCase()
        const getAction = () => {
            switch (method) {
                case "get": return "Read"
                case "post": return "Add"
                case "patch": return "Modify"
                case "put": return "Replace"
                case "delete": return "Delete"
                default: return "Unknown"
            }
        }
        const getData = () => {
            if (method === "post" || method === "put" || method === "patch") {
                const decorator = getDecorator(route!.action.decorators)
                const data = decorator ? decorator.callback.apply(undefined, parameters || []) : parameters
                return JSON.stringify(data)
            }
            else
                return undefined
        }
        const controller = route!.controller.name
        const resource = controller.substr(0, controller.lastIndexOf("Controller"))
        return new Audit(new Date(), state.user && state.userId, resource, getAction(), status, getData())
    }

    constructor(
        public time: Date,
        public user: string | undefined,
        public resource: string,
        public action: "Read" | "Add" | "Modify" | "Replace" | "Delete" | "Unknown",
        public status: "Success" | "Error",
        public data?: string
    ) { }
}

const AuditModel = model(Audit)

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

export class AuditMiddleware implements Middleware {
    async execute(next: Readonly<Invocation>): Promise<ActionResult> {
        if (next.context.route) {
            try {
                const result = await next.proceed()
                await new AuditModel(Audit.fromContext(next.context, "Success")).save()
                return result
            }
            catch (e) {
                await new AuditModel(Audit.fromContext(next.context, "Error")).save()
                throw e;
            }
        }
        else return next.proceed()
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

export class AuditFacility extends DefaultFacility {
    setup(app: Readonly<PlumierApplication>): void {
        app.use(new AuditMiddleware())
    }
}