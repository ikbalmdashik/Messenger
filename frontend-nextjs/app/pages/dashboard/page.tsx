import SendChat from "@/app/components/chat/sendChat";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard"
}

const Dashboard = () => {
    return(
        <>
            <SendChat />
        </>
    );
}

export default Dashboard;