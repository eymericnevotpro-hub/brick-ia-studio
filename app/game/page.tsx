import ForestGame from "./ForestGame";

export const metadata = {
  title: "Congères — survie dans la forêt gelée",
  description:
    "Le jeu de survie que les pubs promettent sans jamais le livrer : couper du bois, monter la palissade, tuer les zombies, cuire la viande et nourrir les rescapés. Aucune mécanique idle.",
};

export default function GamePage() {
  return <ForestGame />;
}
