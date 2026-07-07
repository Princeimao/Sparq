import PreviewCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const products = [
  {
    image: "hello",
    name: "Chocolate Peanut butter",
    price: 750,
    description: "Rich in chocolate high protein peanut butter",
  },
];

const page = () => {
  return (
    <div className="">
      <div className="w-full flex justify-between">
        <h1 className="text-2xl font-semibold mb-2 pl-1">Product</h1>
        <Button variant={"outline"} className="cursor-pointer">
          <span>
            <Plus />
          </span>{" "}
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2"></div>
    </div>
  );
};

export default page;
