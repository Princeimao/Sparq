export class ApiResponse<T> {
    data: T;
    message: string;
    success: boolean;

    constructor(data: T, message: string, success: boolean) {
        this.data = data;
        this.message = message;
        this.success = success;
    }
}

export class ErrorResponse<T> {
    data: T;
    message: string;
    success: boolean;

    constructor(data: T, message: string, success: boolean, statusCode: number) {
        this.data = data;
        this.message = message;
        this.success = success;
    }
}