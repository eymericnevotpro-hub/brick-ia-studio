import NavTabs from "@/components/NavTabs";
import InstallApp from "./InstallApp";

export const metadata = {
  title: "Installer — App Android",
  description: "Installe Discipline sur ton téléphone (PWA ou APK Android).",
};

export default function InstallPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="install" />
      <InstallApp />
    </main>
  );
}
