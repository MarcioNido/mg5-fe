export type CategoryResource = {
    id: number;
    name: string;
    type: string;
    level: number;
    parent: CategoryResource | null;
    children?: CategoryResource[];
};
