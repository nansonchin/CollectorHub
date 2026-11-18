import { AuthForm } from "@/src/features/auth/components/AuthForm";
import { getSession } from "@/src/lib/session";
import { redirect } from "next/navigation";

export default async function SignUpPage(){
    const session = await getSession();
    if(session){
        redirect("/collection");
    }
     return <AuthForm mode="sign-up" />;
}