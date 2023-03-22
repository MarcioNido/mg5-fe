import {api} from "./configs/axiosConfig";

export const FileApi = {

    async getAll() {
        const response = await api.request({
            url: "/api/files/",
            method: "GET",
        })
        return response.data.data;
    },

    async store(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.request({
            method: "post",
            data: formData,
            url: '/api/files',
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data.data;
    }
}
