import { useState } from "react";
import { Box, Input, Button, VStack, Text, useToast } from "@chakra-ui/react";
import { createJob } from "../api/jobs";
import { Job } from "../types/job";

const JobCreation = () => {
  const [totalEmails, setTotalEmails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

  const handleCreateJob = async () => {
    const emailCount = Number(totalEmails);

    if (!totalEmails || isNaN(emailCount) || emailCount <= 0) {
      toast({ title: "Please enter a valid number", status: "error" });
      return;
    }

    setLoading(true);
    try {
      const job: Job = await createJob(emailCount);
      toast({ title: `Job Created: ${job.id}`, status: "success" });
      setTotalEmails("");
    } catch (error) {
      toast({ title: "Failed to create a job", status: "error" });
    }
    setLoading(false);
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <VStack spacing={4}>
        <Text fontSize="xl">Create a New Email Job</Text>
        <Input
          placeholder="Enter number of emails"
          value={totalEmails}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTotalEmails(e.target.value)
          }
          type="number"
        />
        <Button
          onClick={handleCreateJob}
          colorScheme="blue"
          isLoading={loading}
        >
          Start Job
        </Button>
      </VStack>
    </Box>
  );
};

export default JobCreation;
