import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {titleCase} from "tiny-case";
import {CategoryResource} from "common/types/categories";
import {Categories} from "../../../common/apis/Categories";
import {RHFAutocomplete} from "../../../components/hook-form";
import Iconify from "../../../components/iconify";

interface Props {
    name: string;
    label: string;
    maxLevel?: number;
}
export default function RhfCategoriesAutocomplete({ name, label, maxLevel }: Props) {
    const [categoriesList, setCategoriesList] = React.useState<
        CategoryResource[]
    >([]);

    React.useEffect(() => {
        Categories.getAll({
            filters: [{ column: 'level', operator: 'lte', value: maxLevel || 3}],
            orderBy: [{ column: 'name', direction: 'asc' }],
        }).then((res) => setCategoriesList(res.data));
    }, [maxLevel]);

    return (
        <RHFAutocomplete
            name={name}
            label={label}
            options={categoriesList.map((option) => option) as CategoryResource[]}
            getOptionLabel={(option) => (typeof option === 'string' ? option : titleCase(option.name))}
            fullWidth
            renderOption={(props, option) => (
                <li {...props} key={option.id}>
                    {
                        [...Array(option.level - 1)].map((e,i) =>
                            <Iconify key={i} icon="eva:chevron-right-fill" sx={{ verticalAlign: 'middle', mr: 3 }} />
                        )
                    }
                    {titleCase(option.name)}
                </li>
            )}
        />
    );
}
