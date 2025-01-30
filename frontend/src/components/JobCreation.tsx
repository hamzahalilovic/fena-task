import { useState } from "react";
import { Box, Input, Button, VStack, Text, useToast } from "@chakra-ui/react";
import { createJob } from "../api/jobs";
import { Job } from "../types/job";

const JobCreation = () => {
  const [totalEmails, setTotalEmails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleCreateJob = async () => {
    const emailCount = Number(totalEmails);

    if (!totalEmails || isNaN(emailCount) || emailCount <= 0) {
      setError("Please enter a valid number greater than 0.");
      return;
    }

    setError(null); 

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
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl">Create a New Email Job</Text>
        <Input
          placeholder="Enter number of emails"
          value={totalEmails}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            //regex expression to allow only numbers
            if (/^\d*$/.test(value)) {
              setTotalEmails(value);
              setError(
                value === "" || Number(value) > 0
                  ? null
                  : "Only numbers greater than 0 are allowed"
              );
            }
          }}
          type="number"
          min="1"
          step="1"
        />
        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}
        <Button
          onClick={handleCreateJob}
          colorScheme="blue"
          isLoading={loading}
          isDisabled={!totalEmails || Number(totalEmails) <= 0}
        >
          Start Job
        </Button>
      </VStack>
    </Box>
  );
};

export default JobCreation;
