import { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  Button,
  Spinner,
  Progress,
  useToast,
} from "@chakra-ui/react";
import { getAllJobs, deleteJob } from "../api/jobs";
import { Job } from "../types/job";

const JobList = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const toast = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data: Job[] = await getAllJobs();
        setJobs(data);
      } catch (error) {
        console.error("fetching jobs failed", error);
      }
      setLoading(false);
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      toast({ title: "Job deleted successfully", status: "success" });
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
    } catch (error) {
      toast({ title: "Failed to delete job", status: "error" });
    }
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <Text fontSize="xl">Job Status</Text>
      {loading ? (
        <Spinner />
      ) : (
        <VStack spacing={3} align="stretch">
          {jobs.map((job) => (
            <Box key={job.id} p={3} borderWidth={1} borderRadius="md">
              <Text>Job ID: {job.id}</Text>
              <Text>Emails: {job.totalEmails}</Text>
              <Text>Status: {job.status}</Text>
              <Progress
                value={(job.processedEmails / job.totalEmails) * 100}
                size="sm"
                colorScheme="green"
              />
              <Button
                colorScheme="red"
                size="sm"
                onClick={() => handleDelete(job.id)}
              >
                Delete
              </Button>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default JobList;
