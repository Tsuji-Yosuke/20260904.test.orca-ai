import { componentPages } from "@/lib/component-pages.server";
import { HomePage } from "@/views/home-page";

export default function Page() {
  return <HomePage components={componentPages().slice(0, 8)} />;
}
