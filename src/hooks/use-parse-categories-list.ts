import {useCallback} from "react";
import {CategoryResource} from "../common/types/categories";

export default function useParseCategoriesList() {
    const parseCategoriesList = useCallback((categories: CategoryResource[], maxLevel: number) => {
        const parsedCategories: CategoryResource[] = [];
        categories.forEach((category) => {
            if (category.level > maxLevel) {
                return;
            }
            parsedCategories.push(category);
            if (category.children) {
                parsedCategories.push(...parseCategoriesList(category.children, maxLevel));
            }
        });
        return parsedCategories;
    }, []);

    return parseCategoriesList;
}
