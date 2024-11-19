interface ImageUploadProps {
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  return (
    <div className="flex flex-col space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select an image:
        <input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
        />
      </label>
    </div>
  );
};

export default ImageUpload;
