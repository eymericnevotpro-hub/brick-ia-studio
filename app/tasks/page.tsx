import NavTabs from "@/components/NavTabs";
import TasksBoard from "./TasksBoard";

export const metadata = {
  title: "Tâches — Ma discipline du jour",
  description: "Coche tes tâches du jour et suis ta discipline dans le temps.",
};

export default function TasksPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="tasks" />
      <TasksBoard />
    </main>
  );
}
