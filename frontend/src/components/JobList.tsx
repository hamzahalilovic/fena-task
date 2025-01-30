import { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  Button,
  Spinner,
  Progress,
  useToast,
  Badge,
  HStack,
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

        // trigger toast notifications for status changes
        data.forEach((job) => {
          const existingJob = jobs.find((j) => j.id === job.id);
          if (existingJob && existingJob.status !== job.status) {
            toast({
              title: `Job ${job.id} is now ${job.status}`,
              status: job.status === "completed" ? "success" : "info",
              duration: 3000,
              isClosable: true,
            });
          }
        });

        setJobs(data);
      } catch (error) {
        console.error("Fetching jobs failed", error);
      }
      setLoading(false);
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [jobs, toast]);

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
      <Text fontSize="xl" fontWeight="bold">
        Job Status
      </Text>
      {loading ? (
        <Spinner />
      ) : (
        <VStack spacing={3} align="stretch">
          {jobs.map((job) => (
            <Box key={job.id} p={3} borderWidth={1} borderRadius="md">
              <HStack justify="space-between">
                <Text fontSize="md">Job ID: {job.id}</Text>
                <Badge
                  colorScheme={
                    job.status === "completed"
                      ? "green"
                      : job.status === "in-progress"
                      ? "blue"
                      : "yellow"
                  }
                >
                  {job.status}
                </Badge>
              </HStack>

              <Text fontSize="sm">Emails: {job.totalEmails}</Text>
              <Text fontSize="sm">
                Progress:{" "}
                {((job.processedEmails / job.totalEmails) * 100).toFixed(1)}%
              </Text>

              <Progress
                value={(job.processedEmails / job.totalEmails) * 100}
                size="sm"
                colorScheme="green"
              />

              <Button
                colorScheme="red"
                size="sm"
                onClick={() => handleDelete(job.id)}
                mt={2}
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
