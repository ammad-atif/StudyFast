import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/global/Card";
import { Button } from "../components/create-post/Button";
import { Input } from "../components/global/Input";
import { TextArea } from "../components/global/TextArea";
import { api } from "../api";

//Validation Schema
const createPostSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100),
  description: z.string().min(20, "Please provide a more detailed description"),
  chatLink: z.url("Please enter a valid AI chat URL"),
  aiTool: z.enum(["OpenAI", "Claude", "Gemini"], {
    message: "Please pick a valid AI tool",
  }),

  // Keep these optional while fields are not currently rendered in the form.

  tags: z.array(z.string("Each tag must be a string")).optional().default([]),
  subject: z
    .string()
    .min(2, "Please enter a valid subject")
    .optional()
    .or(z.literal("")),
});

type CreatePostFormData = z.input<typeof createPostSchema>;

type CreatePostResponse = {
  message?: string;
};

type PostDetailsResponse = {
  message?: string;
  data: {
    _id: string;
    title: string;
    description: string;
    subject?: string;
    llmName: "OpenAI" | "Claude" | "Gemini";
    chatLink?: string;
  };
};

type ApiErrorShape = {
  message?: string;
};

const aiToolOptions = ["OpenAI", "Claude", "Gemini"] as const;

export const CreatePostPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    // 1. Don't show errors until the user leaves the field for the first time.
    mode: "onSubmit",
    reValidateMode: "onChange", // 2. Re-validate on change after the first error to provide instant feedback.
    // 3. Prevent multiple submissions while the API is hit.
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
      tags: [],
      chatLink: "",
      subject: "",
      aiTool: "OpenAI",
    },
  });

  const postQuery = useQuery<PostDetailsResponse, ApiErrorShape>({
    queryKey: ["post", id, "edit-form"],
    queryFn: async () => api.get(`/posts/${id}`),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!postQuery.data?.data) return;

    const post = postQuery.data.data;
    reset({
      title: post.title,
      description: post.description,
      subject: post.subject || "",
      chatLink: post.chatLink || "",
      aiTool: post.llmName,
      tags: [],
    });
  }, [postQuery.data, reset]);

  const savePostMutation = useMutation<
    CreatePostResponse,
    ApiErrorShape,
    CreatePostFormData
  >({
    mutationFn: async (payload) => {
      const body = {
        title: payload.title,
        description: payload.description,
        subject: payload.subject?.trim() || undefined,
        llmName: payload.aiTool,
        chatLink: payload.chatLink,
      };

      if (isEditMode && id) {
        return api.patch(`/posts/${id}`, body);
      }

      return api.post("/posts", body);
    },
    onSuccess: async (response) => {
      // Keep feed and details views in sync after saving post.
      await queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (isEditMode && id) {
        await queryClient.invalidateQueries({ queryKey: ["post", id] });
      }

      alert(
        response?.message ||
          (isEditMode
            ? "Post updated successfully."
            : "Post created successfully."),
      );
      reset();
      navigate(isEditMode && id ? `/posts/${id}` : "/", { replace: true });
    },
    onError: (error) => {
      alert(error?.message || "Could not save post.");
    },
  });

  const onSubmit = async (data: CreatePostFormData) => {
    await savePostMutation.mutateAsync(data);
  };

  if (isEditMode && postQuery.isLoading) {
    return (
      <main className="p-8 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          Loading post for editing...
        </div>
      </main>
    );
  }

  if (isEditMode && postQuery.isError) {
    return (
      <main className="p-8 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-4xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {postQuery.error?.message || "Could not load post for editing."}
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 min-h-screen flex flex-col items-center">
      <Card
        title={isEditMode ? "Edit Your Post" : "Share an AI Learning Chat"}
        description={
          isEditMode
            ? "Update your post details and publish your changes."
            : "Help others learn by sharing your AI-powered study sessions."
        }
      ></Card>

      <div className="w-full max-w-4xl bg-white border rounded-lg shadow  border-slate-100 p-8">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Post Title */}
          <Input
            label="Post Title"
            placeholder="Example: Understanding Binary Search Trees using ChatGPT"
            error={errors.title?.message}
            {...register("title")}
          />

          {/* Short Description */}
          <TextArea
            label="Short Description"
            placeholder="Explain what concept this AI chat helped you understand."
            error={errors.description?.message}
            {...register("description")}
            rows={4}
          />

          {/* Tags */}
          {/* <TagInput
            label="Tags"
            placeholder="Type a tag and press Enter..."
            tags_value={tags}
            onTagsChange={(newTags) =>
              setValue("tags", newTags, { shouldValidate: true })
            }
            // onBlur={() => setValue("tags", tags, { shouldValidate: true })}
            error={errors.tags?.message}
            maxTags={10}
          /> */}

          {/* AI Tool */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-primary text-[13px] font-bold">
              AI Tool
            </label>
            {/* Use exact backend enum values to avoid invalid submissions. */}
            <select
              {...register("aiTool")}
              className={`w-full p-4 rounded-xl text-sm border border-slate-300 transition-all text-primary bg-white focus:border-primary ${
                errors.aiTool ? "border-red-500 bg-red-50" : ""
              }`}
            >
              {aiToolOptions.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
            {errors.aiTool?.message && (
              <span className="text-red-500 text-[11px] font-semibold ml-1">
                {errors.aiTool.message}
              </span>
            )}
          </div>

          {/* Subject */}
          <Input
            label="Enter Subject"
            placeholder="e.g., Computer Science, Biology, History"
            error={errors.subject?.message}
            {...register("subject")}
          />

          {/* AI Chat URL */}
          <Input
            label="AI Chat URL"
            placeholder="Paste the URL of your AI chat session"
            error={errors.chatLink?.message}
            {...register("chatLink")}
          />

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting || savePostMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || savePostMutation.isPending}
            >
              {isSubmitting || savePostMutation.isPending
                ? isEditMode
                  ? "Saving..."
                  : "Sharing..."
                : isEditMode
                  ? "Save Changes"
                  : "Share Post"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
};
