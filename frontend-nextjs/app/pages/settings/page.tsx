import { Metadata } from "next";

import SettingsComponent from "@/app/components/settings/settings";

export const metadata: Metadata = {
  title: "Settings",
};

const SettingsPage = () => <SettingsComponent />;

export default SettingsPage;
