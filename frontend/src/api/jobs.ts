import axios from "axios";

const API_BASE_URL = "http://localhost:3000/jobs";

export const createJob = async (totalEmails: number) => {
  const response = await axios.post(API_BASE_URL, { totalEmails });
  return response.data;
};

export const getAllJobs = async () => {
  const response = await axios.get(API_BASE_URL);
  return response.data;
};

export const getJobById = async (id: string) => {
  const response = await axios.get(`${API_BASE_URL}/${id}`);
  return response.data;
};

export const deleteJob = async (jobId: string) => {
  const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("failed deleting job");
  }
};
